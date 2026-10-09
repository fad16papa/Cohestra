using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformOpsOverviewServiceTests
{
    [Fact]
    public async Task HideLoadTest_matches_directory_and_excludes_fixture_support()
    {
        await using var db = CreateDb();
        var visibleId = Guid.CreateVersion7();
        var loadId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;

        db.Tenants.AddRange(
            CreateTenant(visibleId, "acme-club", TenantStatus.Active, BillingStatus.Active, now),
            CreateTenant(TenantIds.Default, TenantIds.DefaultSlug, TenantStatus.Active, BillingStatus.Free, now),
            CreateTenant(loadId, "load-storm", TenantStatus.Suspended, BillingStatus.PastDue, now));
        db.SupportIssues.AddRange(
            CreateIssue(visibleId, "acme-club", SupportIssueStatus.Open, now),
            CreateIssue(visibleId, "acme-club", SupportIssueStatus.Resolved, now),
            CreateIssue(loadId, "load-storm", SupportIssueStatus.Open, now),
            CreateIssue(TenantIds.Default, TenantIds.DefaultSlug, SupportIssueStatus.InProgress, now));
        await db.SaveChangesAsync();

        var hidden = await new PlatformOpsOverviewService(db).GetAsync(hideLoadTest: true);
        var shown = await new PlatformOpsOverviewService(db).GetAsync(hideLoadTest: false);

        Assert.Equal(PlatformKpiFreshness.Actual, hidden.TenantStatusCounts.Freshness);
        Assert.Equal(PlatformKpiSources.Tenants, hidden.TenantStatusCounts.Source);
        Assert.Equal("Active", Assert.Single(hidden.TenantStatusCounts.Value!).Key);
        Assert.Equal(1, hidden.TenantStatusCounts.Value![0].Count);
        Assert.Equal("Active", Assert.Single(hidden.BillingStatusCounts.Value!).Key);
        Assert.Equal(1, hidden.OpenSupportCount.Value);
        Assert.Null(hidden.StackHealth.Value);
        Assert.Equal(PlatformKpiFreshness.MissingInstrumentation, hidden.StackHealth.Freshness);
        Assert.Equal(PlatformKpiSources.NotInstrumented, hidden.StackHealth.Source);
        Assert.DoesNotContain("Healthy", hidden.StackHealth.Source, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(3, shown.TenantStatusCounts.Value!.Sum(row => row.Count));
        Assert.Equal(3, shown.OpenSupportCount.Value);
        Assert.Contains(shown.TenantStatusCounts.Value!, row => row is { Key: "Suspended", Count: 1 });
        Assert.Contains(shown.BillingStatusCounts.Value!, row => row is { Key: "Free", Count: 1 });
        Assert.Contains(shown.BillingStatusCounts.Value!, row => row is { Key: "PastDue", Count: 1 });
        Assert.Contains(shown.BillingStatusCounts.Value!, row => row is { Key: "Active", Count: 1 });
        Assert.Equal(TimeSpan.Zero, hidden.OpenSupportCount.ObservedAt.Offset);
    }

    [Fact]
    public async Task Empty_dataset_is_actual_zero_not_missing_or_error()
    {
        await using var db = CreateDb();
        var overview = await new PlatformOpsOverviewService(db).GetAsync(hideLoadTest: true);

        Assert.Empty(overview.TenantStatusCounts.Value!);
        Assert.Empty(overview.BillingStatusCounts.Value!);
        Assert.Equal(0, overview.OpenSupportCount.Value);
        Assert.Equal(PlatformKpiFreshness.Actual, overview.OpenSupportCount.Freshness);
        Assert.Equal(PlatformKpiFreshness.MissingInstrumentation, overview.StackHealth.Freshness);
        Assert.Equal(TimeSpan.Zero, overview.OpenSupportCount.ObservedAt.Offset);
        Assert.True(overview.OpenSupportCount.ObservedAt.UtcDateTime <= DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public void HideLoadTest_visibility_matches_directory_convention()
    {
        var now = DateTimeOffset.UtcNow;
        var tenants = new[]
        {
            CreateTenant(Guid.CreateVersion7(), "acme-club", TenantStatus.Active, BillingStatus.Active, now),
            CreateTenant(TenantIds.Default, TenantIds.DefaultSlug, TenantStatus.Active, BillingStatus.Free, now),
            CreateTenant(Guid.CreateVersion7(), "LOAD-storm", TenantStatus.Suspended, BillingStatus.PastDue, now),
        }.AsQueryable();

        var hidden = PlatformTenantVisibility.ApplyHideLoadTest(tenants, hideLoadTest: true).ToList();
        var shown = PlatformTenantVisibility.ApplyHideLoadTest(tenants, hideLoadTest: false).ToList();

        Assert.Equal("acme-club", Assert.Single(hidden).Slug);
        Assert.Equal(3, shown.Count);
    }

    private static Tenant CreateTenant(
        Guid id,
        string slug,
        TenantStatus status,
        BillingStatus billing,
        DateTimeOffset now) =>
        new()
        {
            Id = id,
            Slug = slug,
            Name = slug,
            Status = status,
            BillingStatus = billing,
            Plan = TenantPlan.Basic,
            CreatedAt = now,
            UpdatedAt = now,
            RegistrationTimeZoneId = "UTC",
        };

    private static SupportIssue CreateIssue(
        Guid tenantId,
        string slug,
        SupportIssueStatus status,
        DateTimeOffset now) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            IssueNumber = $"SUP{now:yyyyMMdd}{Random.Shared.Next(100000, 999999)}",
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Overview count",
            Description = "n/a",
            Status = status,
            OperatorEmail = "ops@example.test",
            OperatorDisplayName = "Ops",
            TenantSlug = slug,
            TenantName = slug,
            Plan = TenantPlan.Basic,
            CreatedAt = now,
            UpdatedAt = now,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
