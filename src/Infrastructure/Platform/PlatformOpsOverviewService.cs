using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformOpsOverviewService(CohestraDbContext dbContext) : IPlatformOpsOverviewService
{
    public async Task<PlatformOpsOverviewResponse> GetAsync(
        bool hideLoadTest,
        CancellationToken cancellationToken = default)
    {
        var tenants = PlatformTenantVisibility.ApplyHideLoadTest(
            dbContext.Tenants.AsNoTracking(),
            hideLoadTest);

        var statusRows = await tenants
            .GroupBy(tenant => tenant.Status)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);
        var statusCounts = statusRows.Select(row => new PlatformNamedCount(row.Key.ToString(), row.Count));

        var billingRows = await tenants
            .GroupBy(tenant => tenant.BillingStatus)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);
        var billingCounts = billingRows.Select(row => new PlatformNamedCount(row.Key.ToString(), row.Count));

        var visibleTenantIds = tenants.Select(tenant => tenant.Id);
        var openSupportCount = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Where(issue =>
                (issue.Status == SupportIssueStatus.Open
                    || issue.Status == SupportIssueStatus.InProgress
                    || issue.Status == SupportIssueStatus.WaitingOnOperator)
                && visibleTenantIds.Contains(issue.TenantId))
            .CountAsync(cancellationToken);

        var observedAt = DateTimeOffset.UtcNow;

        return new PlatformOpsOverviewResponse(
            new PlatformKpi<IReadOnlyList<PlatformNamedCount>>(
                OrderCounts(statusCounts),
                PlatformKpiSources.Tenants,
                observedAt,
                PlatformKpiFreshness.Actual),
            new PlatformKpi<IReadOnlyList<PlatformNamedCount>>(
                OrderCounts(billingCounts),
                PlatformKpiSources.Tenants,
                observedAt,
                PlatformKpiFreshness.Actual),
            new PlatformKpi<int>(
                openSupportCount,
                PlatformKpiSources.SupportIssues,
                observedAt,
                PlatformKpiFreshness.Actual),
            new PlatformKpi<string?>(
                null,
                PlatformKpiSources.NotInstrumented,
                observedAt,
                PlatformKpiFreshness.MissingInstrumentation));
    }

    private static IReadOnlyList<PlatformNamedCount> OrderCounts(IEnumerable<PlatformNamedCount> counts) =>
        counts
            .OrderBy(count => count.Key, StringComparer.Ordinal)
            .ToList();
}
