using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformAuditSearchIntegrationTests(IntegrationTestFixture fixture)
{
    private const string DetailsSecret = "AUDIT_DETAILS_SECRET_44_7";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_search_and_export_are_allow_listed()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Audits Search",
            $"aud-s-{Guid.NewGuid():N}"[..12],
            "admin@aud-s.test");

        var inside = DateTimeOffset.UtcNow;
        await SeedAsync(
            tenant.Id,
            (PlatformAuditAction.TenantSuspended, "ops@example.com", "ToS", inside, DetailsSecret),
            (PlatformAuditAction.PasswordResetSent, "OPS@example.com", "=2+2", inside.AddMinutes(-1), DetailsSecret),
            (PlatformAuditAction.TenantArchived, null, "historical", inside.AddDays(-10), DetailsSecret));

        using var search = await platform.GetAsync(
            $"/api/v1/platform/audits?action=TenantSuspended&tenantId={tenant.Id}&actorEmail=ops@example.com&from={Uri.EscapeDataString(inside.AddHours(-1).ToString("O"))}&to={Uri.EscapeDataString(inside.AddHours(1).ToString("O"))}&page=1");
        Assert.Equal(HttpStatusCode.OK, search.StatusCode);
        var body = await search.Content.ReadAsStringAsync();
        Assert.DoesNotContain(DetailsSecret, body, StringComparison.Ordinal);
        Assert.DoesNotContain("detailsJson", body, StringComparison.OrdinalIgnoreCase);
        var list = JsonSerializer.Deserialize<PlatformAuditListResponse>(body, IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(25, list.PageSize);
        Assert.True(list.Items.Count >= 1);
        Assert.All(list.Items, item =>
        {
            Assert.Equal(tenant.Id, item.TenantId);
            Assert.Equal("TenantSuspended", item.Action);
        });

        using var invalid = await platform.GetAsync("/api/v1/platform/audits?action=MagicAdminOverride");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        using var numericAlias = await platform.GetAsync("/api/v1/platform/audits?action=0");
        Assert.Equal(HttpStatusCode.BadRequest, numericAlias.StatusCode);
        using var numericExport = await platform.GetAsync("/api/v1/platform/audits/export?action=1");
        Assert.Equal(HttpStatusCode.BadRequest, numericExport.StatusCode);

        using var inverted = await platform.GetAsync(
            $"/api/v1/platform/audits?from={Uri.EscapeDataString(inside.ToString("O"))}&to={Uri.EscapeDataString(inside.AddHours(-2).ToString("O"))}");
        Assert.Equal(HttpStatusCode.BadRequest, inverted.StatusCode);

        using var export = await platform.GetAsync(
            $"/api/v1/platform/audits/export?tenantId={tenant.Id}&action=PasswordResetSent");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        Assert.Equal("text/csv", export.Content.Headers.ContentType?.MediaType);
        var csv = await export.Content.ReadAsStringAsync();
        Assert.DoesNotContain(DetailsSecret, csv, StringComparison.Ordinal);
        Assert.DoesNotContain("detailsJson", csv, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("'=2+2", csv, StringComparison.Ordinal);
        Assert.Contains("PasswordResetSent", csv, StringComparison.Ordinal);
        Assert.DoesNotContain("TenantArchived", csv, StringComparison.Ordinal);
        Assert.Contains("cohestra-platform-audits-", export.Content.Headers.ContentDisposition?.FileNameStar ?? export.Content.Headers.ContentDisposition?.FileName ?? "");

        using var detail = await platform.GetAsync($"/api/v1/platform/tenants/{tenant.Id}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        var tenantDetail = await detail.Content.ReadFromJsonAsync<TenantDetailResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(tenantDetail);
        Assert.NotEmpty(tenantDetail.RecentAudits);
    }

    [SkippableFact]
    public async Task Search_and_export_are_PlatformAdmin_only()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var anonymous = Factory.CreateClient();
        using var anonymousSearch = await anonymous.GetAsync("/api/v1/platform/audits");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousSearch.StatusCode);
        using var anonymousExport = await anonymous.GetAsync("/api/v1/platform/audits/export");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousExport.StatusCode);

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            tenantAdmin,
            await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var adminSearch = await tenantAdmin.GetAsync("/api/v1/platform/audits");
        Assert.Equal(HttpStatusCode.Forbidden, adminSearch.StatusCode);
        using var adminExport = await tenantAdmin.GetAsync("/api/v1/platform/audits/export");
        Assert.Equal(HttpStatusCode.Forbidden, adminExport.StatusCode);
    }

    [SkippableFact]
    public async Task Export_over_cap_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Audits Cap",
            $"aud-c-{Guid.NewGuid():N}"[..12],
            "admin@aud-c.test");

        var start = DateTimeOffset.UtcNow.AddDays(-1);
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            for (var i = 0; i < 5001; i++)
            {
                db.PlatformAuditLogs.Add(new PlatformAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    ActorUserId = Guid.CreateVersion7(),
                    ActorEmail = "cap@example.com",
                    TenantId = tenant.Id,
                    Action = PlatformAuditAction.TenantCreated,
                    Reason = "cap",
                    DetailsJson = $"{{\"secret\":\"{DetailsSecret}\"}}",
                    CreatedAt = start.AddSeconds(i),
                });
            }

            await db.SaveChangesAsync();
        }

        using var export = await platform.GetAsync($"/api/v1/platform/audits/export?tenantId={tenant.Id}&action=TenantCreated");
        Assert.Equal(HttpStatusCode.BadRequest, export.StatusCode);
        var body = await export.Content.ReadAsStringAsync();
        Assert.Contains("5000", body, StringComparison.Ordinal);
        Assert.DoesNotContain(DetailsSecret, body, StringComparison.Ordinal);
    }

    private async Task SeedAsync(
        Guid tenantId,
        params (PlatformAuditAction Action, string? Email, string Reason, DateTimeOffset At, string Details)[] rows)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        foreach (var row in rows)
        {
            db.PlatformAuditLogs.Add(new PlatformAuditLog
            {
                Id = Guid.CreateVersion7(),
                ActorUserId = Guid.CreateVersion7(),
                ActorEmail = row.Email,
                TenantId = tenantId,
                Action = row.Action,
                Reason = row.Reason,
                DetailsJson = $"{{\"secret\":\"{row.Details}\"}}",
                CreatedAt = row.At,
            });
        }

        await db.SaveChangesAsync();
    }
}
