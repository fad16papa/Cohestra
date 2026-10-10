using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformAuditSearchServiceTests
{
    [Fact]
    public void TryNormalize_rejects_unknown_action()
    {
        Assert.False(PlatformAuditSearchService.TryNormalize(
            new PlatformAuditSearchQuery("MagicAdminOverride", null, null, null, null),
            out _,
            out var error));
        Assert.Contains("action", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TryNormalize_rejects_from_after_to()
    {
        var from = DateTimeOffset.UtcNow;
        Assert.False(PlatformAuditSearchService.TryNormalize(
            new PlatformAuditSearchQuery(null, null, null, from, from.AddHours(-1)),
            out _,
            out var error));
        Assert.Contains("from", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TryNormalize_accepts_real_action_and_clamps_page_size()
    {
        Assert.True(PlatformAuditSearchService.TryNormalize(
            new PlatformAuditSearchQuery("tenantSuspended", null, "  Ops@Example.com  ", null, null, 0, 500),
            out var normalized,
            out _));
        Assert.Equal(PlatformAuditAction.TenantSuspended, normalized.Action);
        Assert.Equal("ops@example.com", normalized.ActorEmail);
        Assert.Equal(1, normalized.Page);
        Assert.Equal(50, normalized.PageSize);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("00")]
    [InlineData("1")]
    [InlineData("8")]
    [InlineData("99")]
    [InlineData("-1")]
    public void TryNormalize_rejects_numeric_action_aliases(string action)
    {
        Assert.False(PlatformAuditSearchService.TryNormalize(
            new PlatformAuditSearchQuery(action, null, null, null, null),
            out _,
            out var error));
        Assert.Contains("action", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TryNormalize_does_not_invent_severity_action()
    {
        Assert.False(PlatformAuditSearchService.TryNormalize(
            new PlatformAuditSearchQuery("SupportIssueSeverityChanged", null, null, null, null),
            out _,
            out _));
    }

    [Fact]
    public async Task Search_omits_details_orders_newest_first_and_bounds_page()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db);
        var stamp = DateTimeOffset.Parse("2026-10-10T12:00:00Z");
        for (var i = 0; i < 3; i++)
        {
            db.PlatformAuditLogs.Add(Audit(
                tenant.Id,
                stamp.AddMinutes(i),
                PlatformAuditAction.TenantCreated,
                $"AUDIT_DETAILS_SECRET_44_7_{i}",
                "ops@example.com",
                "reason"));
        }

        db.PlatformAuditLogs.Add(Audit(
            tenant.Id,
            stamp.AddMinutes(-10),
            PlatformAuditAction.TenantSuspended,
            "AUDIT_DETAILS_SECRET_44_7",
            "other@example.com",
            "=2+2"));
        await db.SaveChangesAsync();

        var service = new PlatformAuditSearchService(db);
        var result = await service.SearchAsync(new PlatformAuditSearchQuery(
            "TenantCreated",
            tenant.Id,
            "OPS@example.com",
            stamp.AddMinutes(-1),
            stamp.AddMinutes(5),
            1,
            2));

        Assert.True(result.Succeeded);
        Assert.Equal(3, result.Value!.TotalCount);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.True(result.Value.Items[0].CreatedAt >= result.Value.Items[1].CreatedAt);
        Assert.All(result.Value.Items, item =>
        {
            Assert.Equal(PlatformAuditAction.TenantCreated.ToString(), item.Action);
            Assert.Equal("ops@example.com", item.ActorEmail);
        });

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        Assert.DoesNotContain("AUDIT_DETAILS_SECRET_44_7", json, StringComparison.Ordinal);
        Assert.DoesNotContain("detailsJson", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Export_caps_at_5000_and_formula_protects_reason()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db);
        db.PlatformAuditLogs.Add(Audit(
            tenant.Id,
            DateTimeOffset.UtcNow,
            PlatformAuditAction.PasswordResetSent,
            "AUDIT_DETAILS_SECRET_44_7",
            null,
            "=2+2"));
        await db.SaveChangesAsync();

        var service = new PlatformAuditSearchService(db);
        var export = await service.ExportAsync(new PlatformAuditSearchQuery(null, tenant.Id, null, null, null));
        Assert.True(export.Succeeded);
        var csv = System.Text.Encoding.UTF8.GetString(export.Utf8Csv!);
        Assert.Contains("'=2+2", csv, StringComparison.Ordinal);
        Assert.DoesNotContain("AUDIT_DETAILS_SECRET_44_7", csv, StringComparison.Ordinal);
        Assert.StartsWith("cohestra-platform-audits-", export.FileName, StringComparison.Ordinal);
        Assert.EndsWith(".csv", export.FileName, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Export_rejects_when_more_than_5000()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db);
        var start = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        for (var i = 0; i < 5001; i++)
        {
            db.PlatformAuditLogs.Add(Audit(
                tenant.Id,
                start.AddSeconds(i),
                PlatformAuditAction.TenantCreated,
                "AUDIT_DETAILS_SECRET_44_7",
                "ops@example.com",
                "r"));
        }

        await db.SaveChangesAsync();
        var export = await new PlatformAuditSearchService(db).ExportAsync(
            new PlatformAuditSearchQuery(null, tenant.Id, null, null, null));
        Assert.False(export.Succeeded);
        Assert.Contains("5000", export.Error, StringComparison.Ordinal);
        Assert.Null(export.Utf8Csv);
    }

    private static Tenant SeedTenant(CohestraDbContext db)
    {
        var tenant = new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = $"aud-{Guid.NewGuid():N}"[..12],
            Name = "Audits",
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        return tenant;
    }

    private static PlatformAuditLog Audit(
        Guid tenantId,
        DateTimeOffset createdAt,
        PlatformAuditAction action,
        string details,
        string? email,
        string? reason) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = Guid.CreateVersion7(),
            ActorEmail = email,
            TenantId = tenantId,
            Action = action,
            Reason = reason,
            DetailsJson = details,
            CreatedAt = createdAt,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
