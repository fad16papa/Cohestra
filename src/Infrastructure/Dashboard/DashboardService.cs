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
    private const int TrendPeriodDays = 30;

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
                        registration.TenantId == tenantId &&
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
                        timelineEvent.TenantId == tenantId &&
                        (timelineEvent.EventType == ClientTimelineEventType.EmailCampaignSent ||
                        timelineEvent.EventType == ClientTimelineEventType.WhatsAppInitiated ||
                        timelineEvent.EventType == ClientTimelineEventType.WhatsAppFollowUpRecorded))),
                cancellationToken);

        var followUpCoveragePercent = totalLeads == 0
            ? 0
            : Math.Round(followedUpLeads * 100d / totalLeads, 1);

        var activityPerformance = await ComputeActivityPerformanceAsync(
            tenantId,
            periodStart,
            cancellationToken);

        var previousPeriodStart = periodStart.AddDays(-NewLeadsPeriodDays);

        var registrationsInPeriod = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                registration =>
                    registration.TenantId == tenantId &&
                    registration.CreatedAt >= periodStart,
                cancellationToken);

        var registrationsInPreviousPeriod = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                registration =>
                    registration.TenantId == tenantId &&
                    registration.CreatedAt >= previousPeriodStart &&
                    registration.CreatedAt < periodStart,
                cancellationToken);

        var registrationsTrend = await ComputeRegistrationsTrendAsync(
            tenantId,
            computedAt,
            cancellationToken);

        var leadStatusBreakdown = await ComputeLeadStatusBreakdownAsync(
            tenantId,
            cancellationToken);

        return new DashboardMetricsResponse(
            totalLeads,
            newLeadsInPeriod,
            NewLeadsPeriodDays,
            activeActivitiesCount,
            followUpCoveragePercent,
            activityPerformance,
            computedAt,
            registrationsInPeriod,
            registrationsInPreviousPeriod,
            TrendPeriodDays,
            registrationsTrend,
            leadStatusBreakdown);
    }

    private async Task<IReadOnlyList<DashboardTrendPointResponse>> ComputeRegistrationsTrendAsync(
        Guid tenantId,
        DateTimeOffset computedAt,
        CancellationToken cancellationToken)
    {
        var endDate = DateOnly.FromDateTime(computedAt.UtcDateTime);
        var startDate = endDate.AddDays(-(TrendPeriodDays - 1));
        var trendStart = new DateTimeOffset(
            startDate.ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);

        // Group in memory after a windowed fetch — timestamps are stored UTC and the
        // window is at most TrendPeriodDays, so the row volume stays small.
        var registrationTimestamps = await dbContext.Registrations
            .AsNoTracking()
            .Where(registration =>
                registration.TenantId == tenantId &&
                registration.CreatedAt >= trendStart)
            .Select(registration => registration.CreatedAt)
            .ToListAsync(cancellationToken);

        var clientTimestamps = await dbContext.Clients
            .AsNoTracking()
            .Where(client =>
                client.TenantId == tenantId &&
                client.CreatedAt >= trendStart)
            .Select(client => client.CreatedAt)
            .ToListAsync(cancellationToken);

        var registrationsLookup = registrationTimestamps
            .GroupBy(createdAt => DateOnly.FromDateTime(createdAt.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());
        var clientsLookup = clientTimestamps
            .GroupBy(createdAt => DateOnly.FromDateTime(createdAt.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());

        var points = new List<DashboardTrendPointResponse>(TrendPeriodDays);
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            points.Add(new DashboardTrendPointResponse(
                date,
                registrationsLookup.GetValueOrDefault(date),
                clientsLookup.GetValueOrDefault(date)));
        }

        return points;
    }

    private async Task<DashboardLeadStatusBreakdownResponse> ComputeLeadStatusBreakdownAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var counts = await dbContext.Clients
            .AsNoTracking()
            .Where(client => client.TenantId == tenantId)
            .GroupBy(client => client.LeadStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var lookup = counts.ToDictionary(item => item.Status, item => item.Count);

        return new DashboardLeadStatusBreakdownResponse(
            lookup.GetValueOrDefault(LeadStatus.New),
            lookup.GetValueOrDefault(LeadStatus.Contacted),
            lookup.GetValueOrDefault(LeadStatus.Active),
            lookup.GetValueOrDefault(LeadStatus.Inactive));
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
