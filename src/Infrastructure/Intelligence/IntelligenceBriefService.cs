using Cohestra.Application.Clients;
using Cohestra.Application.Intelligence;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Intelligence;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Intelligence;

public sealed class IntelligenceBriefService(
    CohestraDbContext dbContext,
    ICurrentTenant currentTenant) : IIntelligenceBriefService
{
    public const string DeterministicMode = "deterministic";
    private const int EvidenceNameLimit = 5;
    private const int RegistrationWowMinPrevious = 3;
    private const int CapacitySpotThreshold = 3;
    private const int CapacityPercentThreshold = 15;
    private const int PeriodDays = 7;

    public async Task<IntelligenceBriefResponse> GetBriefAsync(
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is null || currentTenant.TenantId == Guid.Empty)
        {
            throw new InvalidOperationException("Tenant context is required for the intelligence brief.");
        }

        var tenantId = currentTenant.TenantId.Value;
        var generatedAt = DateTimeOffset.UtcNow;

        var timeZoneId = await dbContext.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.Id == tenantId)
            .Select(tenant => tenant.RegistrationTimeZoneId)
            .FirstOrDefaultAsync(cancellationToken) ?? RegistrationTimeZoneDefaults.Utc;

        var dueBeforeUtc = RegistrationPeriod.GetStartOfTomorrowUtc(generatedAt, timeZoneId);
        var periodStart = generatedAt.AddDays(-PeriodDays);
        var previousPeriodStart = generatedAt.AddDays(-PeriodDays * 2);

        var clientCount = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(client => client.TenantId == tenantId, cancellationToken);

        var publishedCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(
                activity =>
                    activity.TenantId == tenantId &&
                    activity.Status == ActivityStatus.Published,
                cancellationToken);

        if (clientCount == 0 && publishedCount == 0)
        {
            return new IntelligenceBriefResponse(
                generatedAt,
                timeZoneId,
                DeterministicMode,
                [],
                new IntelligenceInsufficientDataResponse(
                    true,
                    "Not enough operational data yet. Publish an activity or record a registration, then the brief can name what needs attention."));
        }

        var insights = new List<IntelligenceInsightResponse>();

        var dueInsight = await BuildFollowUpDueInsightAsync(tenantId, dueBeforeUtc, cancellationToken);
        if (dueInsight is not null)
        {
            insights.Add(dueInsight);
        }

        var newInsight = await BuildNewWithoutOutreachInsightAsync(tenantId, cancellationToken);
        if (newInsight is not null)
        {
            insights.Add(newInsight);
        }

        var mergeInsight = await BuildMergeSuspectInsightAsync(tenantId, cancellationToken);
        if (mergeInsight is not null)
        {
            insights.Add(mergeInsight);
        }

        var capacityInsights = await BuildCapacityInsightsAsync(tenantId, cancellationToken);
        insights.AddRange(capacityInsights);

        var wowInsight = await BuildRegistrationWowInsightAsync(
            tenantId,
            periodStart,
            previousPeriodStart,
            cancellationToken);
        if (wowInsight is not null)
        {
            insights.Add(wowInsight);
        }

        insights.Sort((left, right) => left.Priority.CompareTo(right.Priority));

        var insufficient = insights.Count == 0
            ? new IntelligenceInsufficientDataResponse(
                true,
                "Nothing needs attention against the grounded rules right now. Due follow-ups, new uncontacted people, merge suspects, and capped activities near capacity are clear.")
            : new IntelligenceInsufficientDataResponse(false, string.Empty);

        return new IntelligenceBriefResponse(
            generatedAt,
            timeZoneId,
            DeterministicMode,
            insights,
            insufficient);
    }

    private async Task<IntelligenceInsightResponse?> BuildFollowUpDueInsightAsync(
        Guid tenantId,
        DateTimeOffset dueBeforeUtc,
        CancellationToken cancellationToken)
    {
        var dueQuery = dbContext.Clients
            .AsNoTracking()
            .Where(client =>
                client.TenantId == tenantId &&
                client.NextFollowUpAt != null &&
                client.NextFollowUpAt < dueBeforeUtc);

        var count = await dueQuery.CountAsync(cancellationToken);
        if (count == 0)
        {
            return null;
        }

        var names = await dueQuery
            .OrderBy(client => client.NextFollowUpAt)
            .Select(client => client.FullName)
            .Take(EvidenceNameLimit)
            .ToListAsync(cancellationToken);

        var evidence = new List<IntelligenceEvidenceResponse>
        {
            new("People due", count.ToString(), "/clients?followUpDue=true"),
        };
        evidence.AddRange(names.Select(name =>
            new IntelligenceEvidenceResponse("Due person", name, "/clients?followUpDue=true")));

        return new IntelligenceInsightResponse(
            "follow-up-due",
            "follow_up_due",
            1,
            count == 1 ? "1 person is due for follow-up" : $"{count} people are due for follow-up",
            "These people already have a next-follow-up date at or before today in your workspace timezone. Opening the due list is the same filter Clients uses.",
            null,
            evidence,
            new IntelligenceActionResponse("Open due follow-ups", "/clients?followUpDue=true"));
    }

    private async Task<IntelligenceInsightResponse?> BuildNewWithoutOutreachInsightAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Clients
            .AsNoTracking()
            .Where(client =>
                client.TenantId == tenantId &&
                client.LeadStatus == LeadStatus.New &&
                !client.TimelineEvents.Any(timelineEvent =>
                    timelineEvent.TenantId == tenantId &&
                    ClientOutreachCoverage.FollowUpCoverageEventTypes.Contains(timelineEvent.EventType)));

        var count = await query.CountAsync(cancellationToken);
        if (count == 0)
        {
            return null;
        }

        var names = await query
            .OrderByDescending(client => client.CreatedAt)
            .Select(client => client.FullName)
            .Take(EvidenceNameLimit)
            .ToListAsync(cancellationToken);

        var evidence = new List<IntelligenceEvidenceResponse>
        {
            new("New, no outreach", count.ToString(), "/clients?leadStatus=new"),
        };
        evidence.AddRange(names.Select(name =>
            new IntelligenceEvidenceResponse("Uncontacted person", name, "/clients?leadStatus=new")));

        return new IntelligenceInsightResponse(
            "new-without-outreach",
            "new_without_outreach",
            2,
            count == 1
                ? "1 new person has no outreach yet"
                : $"{count} new people have no outreach yet",
            "They are still New and have no email, WhatsApp, or Viber outreach on their timeline.",
            null,
            evidence,
            new IntelligenceActionResponse("Open new people", "/clients?leadStatus=new"));
    }

    private async Task<IntelligenceInsightResponse?> BuildMergeSuspectInsightAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Clients
            .AsNoTracking()
            .Where(client => client.TenantId == tenantId && client.IsMergeSuspect);

        var count = await query.CountAsync(cancellationToken);
        if (count == 0)
        {
            return null;
        }

        var names = await query
            .OrderBy(client => client.FullName)
            .Select(client => client.FullName)
            .Take(EvidenceNameLimit)
            .ToListAsync(cancellationToken);

        var evidence = new List<IntelligenceEvidenceResponse>
        {
            new("Merge suspects", count.ToString(), "/clients?mergeSuspect=true"),
        };
        evidence.AddRange(names.Select(name =>
            new IntelligenceEvidenceResponse("Possible duplicate", name, "/clients?mergeSuspect=true")));

        return new IntelligenceInsightResponse(
            "merge-suspects",
            "merge_suspects",
            4,
            count == 1 ? "1 possible duplicate needs a look" : $"{count} possible duplicates need a look",
            "Registration matching flagged these records. Confirm they are the same person before you treat them as two relationships.",
            null,
            evidence,
            new IntelligenceActionResponse("Open merge suspects", "/clients?mergeSuspect=true"));
    }

    private async Task<IReadOnlyList<IntelligenceInsightResponse>> BuildCapacityInsightsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var published = await dbContext.Activities
            .AsNoTracking()
            .Where(activity =>
                activity.TenantId == tenantId &&
                activity.Status == ActivityStatus.Published &&
                activity.MaxRegistrants != null &&
                activity.MaxRegistrants > 0)
            .Select(activity => new
            {
                activity.Id,
                activity.Name,
                Max = activity.MaxRegistrants!.Value,
            })
            .ToListAsync(cancellationToken);

        if (published.Count == 0)
        {
            return [];
        }

        var activityIds = published.Select(activity => activity.Id).ToList();
        var registrationCounts = await dbContext.Registrations
            .AsNoTracking()
            .Where(registration =>
                registration.TenantId == tenantId &&
                activityIds.Contains(registration.ActivityId))
            .GroupBy(registration => registration.ActivityId)
            .Select(group => new { ActivityId = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var registeredByActivity = registrationCounts.ToDictionary(
            item => item.ActivityId,
            item => item.Count);

        var insights = new List<IntelligenceInsightResponse>();
        foreach (var activity in published)
        {
            var registered = registeredByActivity.GetValueOrDefault(activity.Id);
            var remaining = activity.Max - registered;
            if (remaining < 0)
            {
                remaining = 0;
            }

            var percentRemaining = activity.Max == 0
                ? 100
                : remaining * 100 / activity.Max;

            if (remaining > CapacitySpotThreshold && percentRemaining > CapacityPercentThreshold)
            {
                continue;
            }

            var href = $"/activities/{activity.Id:D}";
            insights.Add(new IntelligenceInsightResponse(
                $"capacity-{activity.Id:D}",
                "capacity_pressure",
                3,
                $"{activity.Name} has {remaining} spot{(remaining == 1 ? "" : "s")} left",
                "Capacity is a stored max on this published activity, not a forecast.",
                null,
                [
                    new IntelligenceEvidenceResponse("Registered", registered.ToString(), href),
                    new IntelligenceEvidenceResponse("Capacity", activity.Max.ToString(), href),
                    new IntelligenceEvidenceResponse("Spots left", remaining.ToString(), href),
                ],
                new IntelligenceActionResponse("Open activity", href)));
        }

        return insights;
    }

    private async Task<IntelligenceInsightResponse?> BuildRegistrationWowInsightAsync(
        Guid tenantId,
        DateTimeOffset periodStart,
        DateTimeOffset previousPeriodStart,
        CancellationToken cancellationToken)
    {
        var currentCount = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                registration =>
                    registration.TenantId == tenantId &&
                    registration.CreatedAt >= periodStart,
                cancellationToken);

        var previousCount = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                registration =>
                    registration.TenantId == tenantId &&
                    registration.CreatedAt >= previousPeriodStart &&
                    registration.CreatedAt < periodStart,
                cancellationToken);

        if (previousCount < RegistrationWowMinPrevious)
        {
            return null;
        }

        var delta = currentCount - previousCount;
        var direction = delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";
        var whatChanged = $"{currentCount} registrations in the last {PeriodDays} days vs {previousCount} in the {PeriodDays} days before that ({direction}).";

        return new IntelligenceInsightResponse(
            "registration-wow",
            "registration_wow",
            5,
            $"Registrations are {direction} versus the prior {PeriodDays} days",
            "Both counts are raw registration rows in successive 7-day windows. No conversion rate is inferred.",
            whatChanged,
            [
                new IntelligenceEvidenceResponse("Last 7 days", currentCount.ToString(), "/reports"),
                new IntelligenceEvidenceResponse("Prior 7 days", previousCount.ToString(), "/reports"),
            ],
            new IntelligenceActionResponse("Open reports", "/reports"));
    }
}
