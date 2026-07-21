using Cohestra.Application.Dashboard;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Dashboard;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Dashboard;

public sealed class DashboardService(
    CohestraDbContext dbContext,
    IDashboardMetricsCache metricsCache,
    ICurrentTenant currentTenant) : IDashboardService
{
    private const int NewLeadsPeriodDays = 7;

    public async Task<DashboardMetricsResponse> GetMetricsAsync(
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is null || currentTenant.TenantId == Guid.Empty)
        {
            throw new InvalidOperationException("Tenant context is required for dashboard metrics.");
        }

        var tenantId = currentTenant.TenantId.Value;
        var cached = await metricsCache.GetAsync(tenantId, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var metrics = await ComputeMetricsAsync(tenantId, cancellationToken);
        await metricsCache.SetAsync(tenantId, metrics, cancellationToken);
        return metrics;
    }

    private async Task<DashboardMetricsResponse> ComputeMetricsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var computedAt = DateTimeOffset.UtcNow;
        var periodStart = computedAt.AddDays(-NewLeadsPeriodDays);

        var totalLeads = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(client => client.TenantId == tenantId, cancellationToken);

        var newLeadsInPeriod = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    client.TenantId == tenantId &&
                    client.Registrations.Any(registration =>
                        registration.CreatedAt >= periodStart),
                cancellationToken);

        var activeActivitiesCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(
                activity =>
                    activity.TenantId == tenantId &&
                    activity.Status == ActivityStatus.Published,
                cancellationToken);

        var followedUpLeads = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    client.TenantId == tenantId &&
                    (client.LeadStatus != LeadStatus.New ||
                    client.TimelineEvents.Any(timelineEvent =>
                        timelineEvent.EventType == ClientTimelineEventType.EmailCampaignSent ||
                        timelineEvent.EventType == ClientTimelineEventType.WhatsAppInitiated ||
                        timelineEvent.EventType == ClientTimelineEventType.WhatsAppFollowUpRecorded)),
                cancellationToken);

        var followUpCoveragePercent = totalLeads == 0
            ? 0
            : Math.Round(followedUpLeads * 100d / totalLeads, 1);

        var activityPerformance = await ComputeActivityPerformanceAsync(
            tenantId,
            periodStart,
            cancellationToken);

        return new DashboardMetricsResponse(
            totalLeads,
            newLeadsInPeriod,
            NewLeadsPeriodDays,
            activeActivitiesCount,
            followUpCoveragePercent,
            activityPerformance,
            computedAt);
    }

    private async Task<IReadOnlyList<ActivityPerformanceItemResponse>> ComputeActivityPerformanceAsync(
        Guid tenantId,
        DateTimeOffset periodStart,
        CancellationToken cancellationToken)
    {
        var registrationCounts = await dbContext.Registrations
            .AsNoTracking()
            .Where(registration =>
                registration.TenantId == tenantId &&
                registration.CreatedAt >= periodStart)
            .GroupBy(registration => registration.ActivityId)
            .Select(group => new
            {
                ActivityId = group.Key,
                RegistrationCount = group.Count(),
            })
            .OrderByDescending(item => item.RegistrationCount)
            .ThenBy(item => item.ActivityId)
            .ToListAsync(cancellationToken);

        if (registrationCounts.Count == 0)
        {
            return [];
        }

        var activityIds = registrationCounts.Select(item => item.ActivityId).ToList();
        var activities = await dbContext.Activities
            .AsNoTracking()
            .Where(activity =>
                activity.TenantId == tenantId &&
                activityIds.Contains(activity.Id))
            .ToDictionaryAsync(activity => activity.Id, cancellationToken);

        return registrationCounts
            .Where(item => activities.ContainsKey(item.ActivityId))
            .Select(item =>
            {
                var activity = activities[item.ActivityId];
                return new ActivityPerformanceItemResponse(
                    item.ActivityId,
                    activity.Name,
                    activity.CommunityLabel,
                    activity.Category,
                    activity.Status.ToString().ToLowerInvariant(),
                    item.RegistrationCount);
            })
            .ToList();
    }
}
