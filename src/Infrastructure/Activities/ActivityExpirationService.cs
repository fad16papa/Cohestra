using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityExpirationService(
    CohestraDbContext dbContext,
    RedisPublicActivityCache publicActivityCache,
    IOutboxPublisher outboxPublisher,
    IOptions<ActivityExpirationOptions> options,
    ILogger<ActivityExpirationService> logger)
{
    public async Task<int> BackfillMissingScheduledStartsAtAsync(
        CancellationToken cancellationToken = default)
    {
        var candidates = await dbContext.IgnoreTenantFilters<Activity>()
            .Where(activity => activity.ScheduledStartsAt == null && activity.Schedule != string.Empty)
            .Select(activity => new
            {
                activity.Id,
                activity.TenantId,
                activity.Schedule,
            })
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0)
        {
            return 0;
        }

        var tenantIds = candidates
            .Select(activity => activity.TenantId)
            .Distinct()
            .ToList();

        var tenantTimeZones = await dbContext.IgnoreTenantFilters<Tenant>()
            .AsNoTracking()
            .Where(tenant => tenantIds.Contains(tenant.Id))
            .Select(tenant => new
            {
                tenant.Id,
                tenant.RegistrationTimeZoneId,
            })
            .ToDictionaryAsync(tenant => tenant.Id, cancellationToken);

        var backfilledCount = 0;

        foreach (var candidate in candidates)
        {
            if (!tenantTimeZones.TryGetValue(candidate.TenantId, out var tenant))
            {
                continue;
            }

            var parsed = ActivityScheduleParser.TryParseStartsAt(
                candidate.Schedule,
                tenant.RegistrationTimeZoneId);

            if (parsed is null)
            {
                continue;
            }

            var activity = await dbContext.IgnoreTenantFilters<Activity>()
                .FirstOrDefaultAsync(item => item.Id == candidate.Id, cancellationToken);

            if (activity is null || activity.ScheduledStartsAt is not null)
            {
                continue;
            }

            activity.ScheduledStartsAt = parsed.Value.ToUniversalTime();
            activity.UpdatedAt = DateTimeOffset.UtcNow;
            backfilledCount++;
        }

        if (backfilledCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "Backfilled ScheduledStartsAt for {Count} activities.",
                backfilledCount);
        }

        return backfilledCount;
    }

    public async Task<int> ArchiveExpiredPublishedActivitiesAsync(
        DateTimeOffset utcNow,
        CancellationToken cancellationToken = default)
    {
        var publishedActivities = await dbContext.IgnoreTenantFilters<Activity>()
            .AsNoTracking()
            .Where(activity => activity.Status == ActivityStatus.Published)
            .Select(activity => new
            {
                activity.Id,
                activity.TenantId,
                activity.Name,
                activity.Slug,
                activity.Schedule,
                activity.ScheduledStartsAt,
            })
            .ToListAsync(cancellationToken);

        if (publishedActivities.Count == 0)
        {
            return 0;
        }

        var tenantIds = publishedActivities
            .Select(activity => activity.TenantId)
            .Distinct()
            .ToList();

        var tenants = await dbContext.IgnoreTenantFilters<Tenant>()
            .AsNoTracking()
            .Where(tenant => tenantIds.Contains(tenant.Id))
            .Select(tenant => new
            {
                tenant.Id,
                tenant.RegistrationTimeZoneId,
                tenant.AdminContactEmail,
                tenant.Name,
            })
            .ToDictionaryAsync(tenant => tenant.Id, cancellationToken);

        var archivedCount = 0;
        var cacheInvalidations = new List<(Guid TenantId, string Slug)>();

        foreach (var snapshot in publishedActivities)
        {
            if (!tenants.TryGetValue(snapshot.TenantId, out var tenant))
            {
                continue;
            }

            var probe = new Activity
            {
                Id = snapshot.Id,
                TenantId = snapshot.TenantId,
                Schedule = snapshot.Schedule,
                ScheduledStartsAt = snapshot.ScheduledStartsAt,
            };

            if (!ActivityScheduleExpiration.IsPastEventEnd(
                    probe,
                    tenant.RegistrationTimeZoneId,
                    utcNow))
            {
                continue;
            }

            var activity = await dbContext.IgnoreTenantFilters<Activity>()
                .FirstOrDefaultAsync(
                    item => item.Id == snapshot.Id && item.Status == ActivityStatus.Published,
                    cancellationToken);

            if (activity is null)
            {
                continue;
            }

            activity.Status = ActivityStatus.Archived;
            activity.UpdatedAt = utcNow;
            archivedCount++;
            cacheInvalidations.Add((snapshot.TenantId, snapshot.Slug));

            await EnqueueAutoArchiveNotificationsAsync(
                snapshot.TenantId,
                snapshot.Id,
                snapshot.Name,
                snapshot.Schedule,
                tenant.AdminContactEmail,
                tenant.Name,
                utcNow,
                cancellationToken);

            logger.LogInformation(
                "Auto-archived expired published activity {ActivityId} ({ActivityName}) for tenant {TenantId}.",
                snapshot.Id,
                snapshot.Name,
                snapshot.TenantId);
        }

        if (archivedCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);

            foreach (var (tenantId, slug) in cacheInvalidations)
            {
                try
                {
                    await publicActivityCache.InvalidateAsync(tenantId, slug, cancellationToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(
                        ex,
                        "Failed to invalidate public activity cache for tenant {TenantId}, slug {Slug}.",
                        tenantId,
                        slug);
                }
            }
        }

        return archivedCount;
    }

    public async Task<int> SendExpiringSoonWarningsAsync(
        DateTimeOffset utcNow,
        CancellationToken cancellationToken = default)
    {
        if (!options.Value.NotifyOnExpiringSoon)
        {
            return 0;
        }

        var warningWindow = TimeSpan.FromHours(Math.Clamp(options.Value.ExpiringSoonHoursBeforeEnd, 1, 72));

        var publishedActivities = await dbContext.IgnoreTenantFilters<Activity>()
            .AsNoTracking()
            .Where(activity => activity.Status == ActivityStatus.Published)
            .Select(activity => new
            {
                activity.Id,
                activity.TenantId,
                activity.Name,
                activity.Schedule,
                activity.ScheduledStartsAt,
            })
            .ToListAsync(cancellationToken);

        if (publishedActivities.Count == 0)
        {
            return 0;
        }

        var tenantIds = publishedActivities
            .Select(activity => activity.TenantId)
            .Distinct()
            .ToList();

        var tenants = await dbContext.IgnoreTenantFilters<Tenant>()
            .AsNoTracking()
            .Where(tenant => tenantIds.Contains(tenant.Id))
            .Select(tenant => new
            {
                tenant.Id,
                tenant.RegistrationTimeZoneId,
                tenant.AdminContactEmail,
                tenant.Name,
            })
            .ToDictionaryAsync(tenant => tenant.Id, cancellationToken);

        var warningsQueued = 0;

        foreach (var snapshot in publishedActivities)
        {
            if (!tenants.TryGetValue(snapshot.TenantId, out var tenant))
            {
                continue;
            }

            var probe = new Activity
            {
                Id = snapshot.Id,
                TenantId = snapshot.TenantId,
                Schedule = snapshot.Schedule,
                ScheduledStartsAt = snapshot.ScheduledStartsAt,
            };

            var eventEndUtc = ActivityScheduleExpiration.ResolveEventEndUtc(
                probe,
                tenant.RegistrationTimeZoneId);

            if (eventEndUtc is null)
            {
                continue;
            }

            var warningStartsAt = eventEndUtc.Value - warningWindow;
            if (utcNow < warningStartsAt || utcNow >= eventEndUtc.Value)
            {
                continue;
            }

            var recipients = await ActivityNotificationRecipients.ResolveAsync(
                dbContext,
                snapshot.TenantId,
                tenant.AdminContactEmail,
                includeTeamMembers: options.Value.NotifyTeamOnAutoArchive,
                includeAdminContact: options.Value.NotifyAdminOnAutoArchive,
                cancellationToken);

            foreach (var recipientEmail in recipients)
            {
                EnqueueExpiringSoonNotification(
                    snapshot.TenantId,
                    snapshot.Id,
                    snapshot.Name,
                    snapshot.Schedule,
                    recipientEmail,
                    tenant.Name,
                    eventEndUtc.Value);
                warningsQueued++;
            }
        }

        if (warningsQueued > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Queued {Count} activity expiring-soon notifications.", warningsQueued);
        }

        return warningsQueued;
    }

    private async Task EnqueueAutoArchiveNotificationsAsync(
        Guid tenantId,
        Guid activityId,
        string activityName,
        string schedule,
        string? adminContactEmail,
        string tenantName,
        DateTimeOffset archivedAtUtc,
        CancellationToken cancellationToken)
    {
        if (!options.Value.NotifyAdminOnAutoArchive && !options.Value.NotifyTeamOnAutoArchive)
        {
            return;
        }

        var recipients = await ActivityNotificationRecipients.ResolveAsync(
            dbContext,
            tenantId,
            adminContactEmail,
            includeTeamMembers: options.Value.NotifyTeamOnAutoArchive,
            includeAdminContact: options.Value.NotifyAdminOnAutoArchive,
            cancellationToken);

        foreach (var recipientEmail in recipients)
        {
            EnqueueExpiredNotification(
                tenantId,
                activityId,
                activityName,
                schedule,
                recipientEmail,
                tenantName,
                archivedAtUtc);
        }
    }

    private void EnqueueExpiredNotification(
        Guid tenantId,
        Guid activityId,
        string activityName,
        string schedule,
        string recipientEmail,
        string tenantName,
        DateTimeOffset archivedAtUtc)
    {
        var payload = JsonSerializer.Serialize(new ActivityExpiredOutboxPayload(
            activityId,
            activityName,
            schedule,
            recipientEmail,
            tenantName,
            archivedAtUtc));

        outboxPublisher.Enqueue(
            tenantId,
            OutboxMessageTypes.ActivityExpired,
            payload,
            $"activity-expired:{activityId:D}:{recipientEmail}:{archivedAtUtc.UtcDateTime:yyyyMMdd}");
    }

    private void EnqueueExpiringSoonNotification(
        Guid tenantId,
        Guid activityId,
        string activityName,
        string schedule,
        string recipientEmail,
        string tenantName,
        DateTimeOffset eventEndsAtUtc)
    {
        var payload = JsonSerializer.Serialize(new ActivityExpiringSoonOutboxPayload(
            activityId,
            activityName,
            schedule,
            recipientEmail,
            tenantName,
            eventEndsAtUtc));

        outboxPublisher.Enqueue(
            tenantId,
            OutboxMessageTypes.ActivityExpiringSoon,
            payload,
            $"activity-expiring-soon:{activityId:D}:{recipientEmail}:{eventEndsAtUtc.UtcDateTime:yyyyMMdd}");
    }
}
