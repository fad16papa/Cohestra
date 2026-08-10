using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Daily billing lifecycle jobs: trial reminders, delinquency, dormancy (Story 14.8).
/// </summary>
public sealed class BillingJobsHostedService(
    IServiceScopeFactory scopeFactory,
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
                    now,
                    cancellationToken);
                await ProcessDelinquencyAsync(tenant, db, outboxPublisher, now, cancellationToken);
                await ProcessDormancyAsync(tenant, db, outboxPublisher, now, cancellationToken);
                await ApplyScheduledPlanIfDueAsync(tenant, db, now, cancellationToken);

                _ = accessService;
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
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.ScheduledPlan is not TenantPlan scheduled
            || tenant.ScheduledPlanEffectiveAt is null
            || now < tenant.ScheduledPlanEffectiveAt)
        {
            return;
        }

        StripeTenantBillingSync.ApplyScheduledPlan(tenant, scheduled);
        await db.SaveChangesAsync(cancellationToken);
    }

    private Task ProcessTrialReminderAsync(
        Tenant tenant,
        CohestraDbContext db,
        IOutboxPublisher outboxPublisher,
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

        const string billingLine = "Manage billing from Settings → Billing in your workspace.";

        var plainBody = $"Your Cohestra trial ends on {trialEnd:MMMM d, yyyy}. {billingLine}";
        var htmlBody = $"<p>Your trial ends on <strong>{trialEnd:MMMM d, yyyy}</strong>.</p><p>{billingLine}</p>";
        EnqueueBillingNotification(
            outboxPublisher,
            tenant,
            BillingNotificationNoticeTypes.TrialReminder,
            $"Trial ending soon — {tenant.Name}",
            plainBody,
            htmlBody,
            $"billing:trial-reminder:{tenant.Id}:{now:yyyy-MM-dd}",
            now);
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

            EnqueueBillingNotification(
                outboxPublisher,
                tenant,
                BillingNotificationNoticeTypes.PastDue,
                "Payment past due",
                "Your last payment did not succeed. Update your payment method to keep full access.",
                "<p>Your last payment did not succeed. Update your payment method to keep full access.</p>",
                $"billing:past-due:{tenant.Id}:{now:yyyy-MM-dd}",
                now);
            return Task.CompletedTask;
        }

        if (tenant.BillingStatus == BillingStatus.OnHold)
        {
            if (tenant.LastOnHoldNoticeAt is { } last && (now - last).TotalDays < 7)
            {
                return Task.CompletedTask;
            }

            EnqueueBillingNotification(
                outboxPublisher,
                tenant,
                BillingNotificationNoticeTypes.OnHold,
                "Workspace on hold",
                "Billing is on hold. The workspace is read-only until payment is restored.",
                "<p>Billing is on hold. The workspace is read-only until payment is restored.</p>",
                $"billing:on-hold:{tenant.Id}:{now:yyyy-MM-dd}",
                now);
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

            EnqueueBillingNotification(
                outboxPublisher,
                tenant,
                BillingNotificationNoticeTypes.Dormancy,
                $"Inactive workspace — {tenant.Name}",
                "Your free Basic workspace will archive in 7 days without admin activity or public registrations.",
                "<p>Your free Basic workspace will archive in 7 days without admin activity or public registrations.</p>",
                $"billing:dormancy:{tenant.Id}",
                now);
        }

        return Task.CompletedTask;
    }

    private static void EnqueueBillingNotification(
        IOutboxPublisher outboxPublisher,
        Tenant tenant,
        string noticeType,
        string subject,
        string plainBody,
        string htmlBody,
        string dedupeKey,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        var payload = JsonSerializer.Serialize(new BillingNotificationOutboxPayload(
            tenant.Id,
            noticeType,
            tenant.AdminContactEmail.Trim(),
            subject,
            plainBody,
            htmlBody));

        outboxPublisher.Enqueue(
            tenant.Id,
            OutboxMessageTypes.BillingNotification,
            payload,
            dedupeKey);

        switch (noticeType)
        {
            case BillingNotificationNoticeTypes.TrialReminder:
                tenant.LastTrialReminderSentAt = now;
                break;
            case BillingNotificationNoticeTypes.PastDue:
                tenant.LastPastDueNoticeAt = now;
                break;
            case BillingNotificationNoticeTypes.OnHold:
                tenant.LastOnHoldNoticeAt = now;
                break;
            case BillingNotificationNoticeTypes.Dormancy:
                tenant.LastDormancyWarningAt = now;
                break;
        }

        tenant.UpdatedAt = now;
    }
}
