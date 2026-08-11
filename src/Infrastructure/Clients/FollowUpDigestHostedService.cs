using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Clients;

public sealed class FollowUpDigestOptions
{
    public const string SectionName = "FollowUpDigest";

    public bool Enabled { get; set; } = false;
}

/// <summary>
/// Daily digest email to tenant admins listing clients with follow-ups due today or overdue.
/// </summary>
public sealed class FollowUpDigestHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<FollowUpDigestOptions> options,
    ILogger<FollowUpDigestHostedService> logger) : BackgroundService
{
    private const long FollowUpDigestAdvisoryLockKey = 574839201234567891L;
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation("Follow-up digest job is disabled.");
            return;
        }

        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunDailyDigestAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Follow-up digest run failed");
            }

            await Task.Delay(RunInterval, stoppingToken);
        }
    }

    internal async Task RunDailyDigestAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled)
        {
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var outboxPublisher = scope.ServiceProvider.GetRequiredService<IOutboxPublisher>();

        if (!await TryAcquireLockAsync(db, cancellationToken))
        {
            logger.LogInformation("Follow-up digest skipped — another instance holds the advisory lock.");
            return;
        }

        try
        {
            var now = DateTimeOffset.UtcNow;
            var tenants = await db.Tenants
                .AsNoTracking()
                .Where(tenant => tenant.Status == TenantStatus.Active)
                .Select(tenant => new
                {
                    tenant.Id,
                    tenant.Name,
                    tenant.Slug,
                    tenant.AdminContactEmail,
                    tenant.RegistrationTimeZoneId,
                })
                .ToListAsync(cancellationToken);

            foreach (var tenant in tenants)
            {
                if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
                {
                    continue;
                }

                var dueBeforeUtc = RegistrationPeriod.GetStartOfTomorrowUtc(
                    now,
                    tenant.RegistrationTimeZoneId);

                var dueCount = await db.Clients
                    .AsNoTracking()
                    .CountAsync(
                        client =>
                            client.TenantId == tenant.Id
                            && client.NextFollowUpAt != null
                            && client.NextFollowUpAt < dueBeforeUtc,
                        cancellationToken);

                if (dueCount == 0)
                {
                    continue;
                }

                var subject = dueCount == 1
                    ? "1 client follow-up due today"
                    : $"{dueCount} client follow-ups due today";

                var plainBody =
                    $"You have {dueCount} client{(dueCount == 1 ? "" : "s")} with follow-ups due today or overdue in {tenant.Name}. "
                    + "Open your Clients queue in Cohestra to review them.";

                var htmlBody =
                    $"<p>You have <strong>{dueCount}</strong> client{(dueCount == 1 ? "" : "s")} "
                    + $"with follow-ups due today or overdue in <strong>{tenant.Name}</strong>.</p>"
                    + "<p>Open your Clients queue in Cohestra to review them.</p>";

                var payload = JsonSerializer.Serialize(new BillingNotificationOutboxPayload(
                    tenant.Id,
                    BillingNotificationNoticeTypes.FollowUpDigest,
                    tenant.AdminContactEmail.Trim(),
                    subject,
                    plainBody,
                    htmlBody));

                outboxPublisher.Enqueue(
                    tenant.Id,
                    OutboxMessageTypes.BillingNotification,
                    payload,
                    $"follow-up-digest:{tenant.Id}:{now.UtcDateTime:yyyy-MM-dd}");
            }

            await db.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            await ReleaseLockAsync(db, cancellationToken);
        }
    }

    private static async Task<bool> TryAcquireLockAsync(
        CohestraDbContext db,
        CancellationToken cancellationToken)
    {
        return await db.Database
            .SqlQueryRaw<bool>("SELECT pg_try_advisory_lock({0})", FollowUpDigestAdvisoryLockKey)
            .SingleAsync(cancellationToken);
    }

    private static async Task ReleaseLockAsync(
        CohestraDbContext db,
        CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_unlock({0})",
            [FollowUpDigestAdvisoryLockKey],
            cancellationToken);
    }
}
