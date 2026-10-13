using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Daily billing lifecycle jobs: trial reminders, delinquency, dormancy (Story 14.8).
/// </summary>
public sealed class BillingJobsHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<PublicWebOptions> publicWebOptions,
    ILogger<BillingJobsHostedService> logger) : BackgroundService
{
    private const long BillingJobsAdvisoryLockKey = 574839201234567890L;
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunDailyJobsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Billing jobs run failed");
            }

            await Task.Delay(RunInterval, stoppingToken);
        }
    }

    internal async Task RunDailyJobsAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var outboxPublisher = scope.ServiceProvider.GetRequiredService<IOutboxPublisher>();
        var accessService = scope.ServiceProvider.GetRequiredService<ITenantAccessService>();

        if (!await TryAcquireBillingJobsLockAsync(db, cancellationToken))
        {
            logger.LogInformation("Billing daily jobs skipped — another instance holds the advisory lock.");
            return;
        }

        try
        {
            var now = DateTimeOffset.UtcNow;
            var tenants = await db.Tenants.ToListAsync(cancellationToken);

            foreach (var tenant in tenants)
            {
                if (tenant.Status != TenantStatus.Active)
                {
                    continue;
                }

                await ProcessTrialReminderAsync(
                    tenant,
                    db,
                    outboxPublisher,
                    publicWebOptions.Value,
                    now,
                    cancellationToken);
                await ProcessDelinquencyAsync(tenant, db, outboxPublisher, now, cancellationToken);
                await ProcessDormancyAsync(tenant, db, outboxPublisher, now, cancellationToken);
                await ProcessScheduledDowngradeRemindersAsync(
                    tenant,
                    outboxPublisher,
                    accessService,
                    publicWebOptions.Value,
                    now,
                    cancellationToken);
                await ApplyScheduledPlanIfDueAsync(
                    tenant,
                    db,
                    outboxPublisher,
                    publicWebOptions.Value,
                    now,
                    cancellationToken);
            }

            await db.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            await ReleaseBillingJobsLockAsync(db, cancellationToken);
        }
    }

    private static async Task<bool> TryAcquireBillingJobsLockAsync(
        CohestraDbContext db,
        CancellationToken cancellationToken)
    {
        return await db.Database
            .SqlQueryRaw<bool>("SELECT pg_try_advisory_lock({0})", BillingJobsAdvisoryLockKey)
            .SingleAsync(cancellationToken);
    }

    private static async Task ReleaseBillingJobsLockAsync(
        CohestraDbContext db,
        CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_unlock({0})",
            [BillingJobsAdvisoryLockKey],
            cancellationToken);
    }

    private static async Task ApplyScheduledPlanIfDueAsync(
        Tenant tenant,
        CohestraDbContext db,
        IOutboxPublisher outboxPublisher,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.ScheduledPlan is not TenantPlan scheduled
            || tenant.ScheduledPlanEffectiveAt is null
            || now < tenant.ScheduledPlanEffectiveAt)
        {
            return;
        }

        TenantBillingPlanSync.ApplyScheduledPlan(tenant, scheduled);
        await db.SaveChangesAsync(cancellationToken);

        BillingNotificationComposer.EnqueueScheduledDowngradeApplied(
            outboxPublisher,
            tenant,
            scheduled,
            publicWebOptions,
            now);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task ProcessScheduledDowngradeRemindersAsync(
        Tenant tenant,
        IOutboxPublisher outboxPublisher,
        ITenantAccessService accessService,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (!BillingNotificationComposer.HasScheduledPaidDowngrade(tenant)
            || tenant.ScheduledPlan is not TenantPlan targetPlan
            || tenant.ScheduledPlanEffectiveAt is not { } effectiveAt)
        {
            return;
        }

        var reminderDays = BillingNotificationComposer.ResolveScheduledDowngradeReminderDays(now, effectiveAt);
        if (reminderDays is null)
        {
            return;
        }

        var usage = await accessService.GetUsageAsync(tenant.Id, cancellationToken);
        var warnings = BillingDowngradeLimitWarnings.Build(usage, targetPlan);
        if (warnings.Count == 0)
        {
            return;
        }

        BillingNotificationComposer.EnqueueScheduledDowngradeReminder(
            outboxPublisher,
            tenant,
            targetPlan,
            effectiveAt,
            reminderDays.Value,
            warnings,
            publicWebOptions,
            now);
    }

    private Task ProcessTrialReminderAsync(
        Tenant tenant,
        CohestraDbContext db,
        IOutboxPublisher outboxPublisher,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary
            || tenant.BillingStatus != BillingStatus.Trialing
            || tenant.TrialEndsAt is not { } trialEnd
            || trialEnd <= now
            || trialEnd > now.AddDays(7))
        {
            return Task.CompletedTask;
        }

        if (tenant.LastTrialReminderSentAt is { } last && last.Date == now.Date)
        {
            return Task.CompletedTask;
        }

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return Task.CompletedTask;
        }

        BillingNotificationComposer.EnqueueTrialReminder(
            outboxPublisher,
            tenant,
            trialEnd,
            publicWebOptions,
            now);
        tenant.LastTrialReminderSentAt = now;
        tenant.UpdatedAt = now;
        return Task.CompletedTask;
    }

    private static Task ProcessDelinquencyAsync(
        Tenant tenant,
        CohestraDbContext db,
        IOutboxPublisher outboxPublisher,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary || tenant.DelinquencyStartedAt is not { } started)
        {
            return Task.CompletedTask;
        }

        var days = (int)Math.Floor((now - started).TotalDays) + 1;

        if (days >= 29 && tenant.Status == TenantStatus.Active)
        {
            tenant.Status = TenantStatus.Archived;
            tenant.ArchivedAt = now;
            tenant.UpdatedAt = now;
            return Task.CompletedTask;
        }

        if (days >= 8 && tenant.BillingStatus == BillingStatus.PastDue)
        {
            tenant.BillingStatus = BillingStatus.OnHold;
            tenant.UpdatedAt = now;
        }

        if (tenant.BillingStatus == BillingStatus.PastDue)
        {
            if (tenant.LastPastDueNoticeAt is { } last && last.Date == now.Date)
            {
                return Task.CompletedTask;
            }

            BillingNotificationComposer.EnqueuePastDue(outboxPublisher, tenant, now);
            tenant.LastPastDueNoticeAt = now;
            tenant.UpdatedAt = now;
            return Task.CompletedTask;
        }

        if (tenant.BillingStatus == BillingStatus.OnHold)
        {
            if (tenant.LastOnHoldNoticeAt is { } last && (now - last).TotalDays < 7)
            {
                return Task.CompletedTask;
            }

            BillingNotificationComposer.EnqueueOnHold(outboxPublisher, tenant, now);
            tenant.LastOnHoldNoticeAt = now;
            tenant.UpdatedAt = now;
        }

        return Task.CompletedTask;
    }

    private static Task ProcessDormancyAsync(
        Tenant tenant,
        CohestraDbContext db,
        IOutboxPublisher outboxPublisher,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary
            || tenant.Plan is not TenantPlan.Basic
            || tenant.BillingStatus is not BillingStatus.Free)
        {
            return Task.CompletedTask;
        }

        var lastActivity = tenant.LastActivityAt ?? tenant.CreatedAt;
        var idleDays = (int)Math.Floor((now - lastActivity).TotalDays);

        if (idleDays >= 90 && tenant.Status == TenantStatus.Active)
        {
            tenant.Status = TenantStatus.Archived;
            tenant.ArchivedAt = now;
            tenant.UpdatedAt = now;
            return Task.CompletedTask;
        }

        if (idleDays >= 83)
        {
            if (tenant.LastDormancyWarningAt is not null)
            {
                return Task.CompletedTask;
            }

            if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
            {
                return Task.CompletedTask;
            }

            BillingNotificationComposer.EnqueueDormancy(outboxPublisher, tenant, now);
            tenant.LastDormancyWarningAt = now;
            tenant.UpdatedAt = now;
        }

        return Task.CompletedTask;
    }

}
