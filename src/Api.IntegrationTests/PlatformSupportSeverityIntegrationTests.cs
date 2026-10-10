using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Support;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformSupportSeverityIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Tenant_create_defaults_unspecified_and_platform_can_triage()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Severity Tenant",
            $"sev-{Guid.NewGuid():N}"[..12],
            "admin@sev.test");

        Guid issueId;
        string issueNumber;
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var support = scope.ServiceProvider.GetRequiredService<ISupportIssueService>();
            var created = await support.CreateAsync(new SupportIssueCreateRequest(
                tenant.Id,
                Guid.CreateVersion7(),
                "filer@sev.test",
                "Filer",
                "Need help",
                "The printer is on fire",
                "vitest",
                []));
            issueId = created.Id;
            issueNumber = created.IssueNumber;

            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var stored = await db.IgnoreTenantFilters<SupportIssue>().SingleAsync(item => item.Id == issueId);
            Assert.Equal(SupportIssueSeverity.Unspecified, stored.Severity);
        }

        using var invalid = await platform.GetAsync("/api/v1/platform/support-issues?severity=Emergency");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        using var numeric = await platform.GetAsync("/api/v1/platform/support-issues?severity=0");
        Assert.Equal(HttpStatusCode.BadRequest, numeric.StatusCode);

        using var listed = await platform.GetAsync($"/api/v1/platform/support-issues?severity=Unspecified&search={issueNumber}");
        Assert.Equal(HttpStatusCode.OK, listed.StatusCode);
        var list = await listed.Content.ReadFromJsonAsync<PlatformSupportIssueListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Contains(list!.Items, item => item.Id == issueId && item.Severity == "Unspecified");

        using var detail = await platform.GetAsync($"/api/v1/platform/support-issues/{issueId}");
        var before = await detail.Content.ReadFromJsonAsync<PlatformSupportIssueDetailResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Equal("Unspecified", before!.Severity);

        using var anonymous = Factory.CreateClient();
        using var anonPatch = await anonymous.PatchAsync(
            $"/api/v1/platform/support-issues/{issueId}",
            JsonContent.Create(new { severity = "High" }));
        Assert.Equal(HttpStatusCode.Unauthorized, anonPatch.StatusCode);

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(tenantAdmin, await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var adminPatch = await tenantAdmin.PatchAsync(
            $"/api/v1/platform/support-issues/{issueId}",
            JsonContent.Create(new { severity = "High" }));
        Assert.Equal(HttpStatusCode.Forbidden, adminPatch.StatusCode);

        using var missing = await platform.PatchAsync(
            $"/api/v1/platform/support-issues/{Guid.CreateVersion7()}",
            JsonContent.Create(new { severity = "High" }));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        using var empty = await platform.PatchAsync(
            $"/api/v1/platform/support-issues/{issueId}",
            JsonContent.Create(new { severity = "" }));
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);

        using var patched = await platform.PatchAsync(
            $"/api/v1/platform/support-issues/{issueId}",
            JsonContent.Create(new { severity = "High" }));
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
        var after = await patched.Content.ReadFromJsonAsync<PlatformSupportIssueDetailResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Equal("High", after!.Severity);
        Assert.Equal("Open", after.Status);

        using var same = await platform.PatchAsync(
            $"/api/v1/platform/support-issues/{issueId}",
            JsonContent.Create(new { severity = "High" }));
        Assert.Equal(HttpStatusCode.OK, same.StatusCode);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var audits = await db.PlatformAuditLogs
                .Where(row => row.TenantId == tenant.Id && row.Action == PlatformAuditAction.SupportIssueSeverityChanged)
                .ToListAsync();
            Assert.Single(audits);
            using var details = JsonDocument.Parse(audits[0].DetailsJson ?? "{}");
            Assert.Equal(issueNumber, details.RootElement.GetProperty("issueNumber").GetString());
            Assert.Equal("Unspecified", details.RootElement.GetProperty("previousSeverity").GetString());
            Assert.Equal("High", details.RootElement.GetProperty("newSeverity").GetString());
            Assert.Equal(3, details.RootElement.EnumerateObject().Count());
            Assert.DoesNotContain("The printer is on fire", audits[0].DetailsJson ?? "");
        }

        using var auditsSearch = await platform.GetAsync(
            $"/api/v1/platform/audits?action=SupportIssueSeverityChanged&tenantId={tenant.Id}");
        Assert.Equal(HttpStatusCode.OK, auditsSearch.StatusCode);
        var auditsBody = await auditsSearch.Content.ReadAsStringAsync();
        Assert.Contains("SupportIssueSeverityChanged", auditsBody, StringComparison.Ordinal);
        Assert.DoesNotContain("The printer is on fire", auditsBody, StringComparison.Ordinal);
        Assert.DoesNotContain("detailsJson", auditsBody, StringComparison.OrdinalIgnoreCase);

        using var csv = await platform.GetAsync(
            $"/api/v1/platform/audits/export?action=SupportIssueSeverityChanged&tenantId={tenant.Id}");
        Assert.Equal(HttpStatusCode.OK, csv.StatusCode);
        var csvBody = await csv.Content.ReadAsStringAsync();
        Assert.Contains("SupportIssueSeverityChanged", csvBody, StringComparison.Ordinal);
        Assert.DoesNotContain("The printer is on fire", csvBody, StringComparison.Ordinal);
    }
}
