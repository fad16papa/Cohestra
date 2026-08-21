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

            await publicActivityCache.InvalidateAsync(snapshot.TenantId, snapshot.Slug, cancellationToken);

            if (options.Value.NotifyAdminOnAutoArchive &&
                !string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
            {
                EnqueueAdminNotification(
                    snapshot.TenantId,
                    snapshot.Id,
                    snapshot.Name,
                    snapshot.Schedule,
                    tenant.AdminContactEmail.Trim(),
                    tenant.Name,
                    utcNow);
            }

            logger.LogInformation(
                "Auto-archived expired published activity {ActivityId} ({ActivityName}) for tenant {TenantId}.",
                snapshot.Id,
                snapshot.Name,
                snapshot.TenantId);
        }

        if (archivedCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return archivedCount;
    }

    private void EnqueueAdminNotification(
        Guid tenantId,
        Guid activityId,
        string activityName,
        string schedule,
        string adminEmail,
        string tenantName,
        DateTimeOffset archivedAtUtc)
    {
        var payload = JsonSerializer.Serialize(new ActivityExpiredOutboxPayload(
            activityId,
            activityName,
            schedule,
            adminEmail,
            tenantName,
            archivedAtUtc));

        outboxPublisher.Enqueue(
            tenantId,
            OutboxMessageTypes.ActivityExpired,
            payload,
            $"activity-expired:{activityId:D}:{archivedAtUtc.UtcDateTime:yyyyMMdd}");
    }
}
