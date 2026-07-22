using Cohestra.Application.Billing;
using Cohestra.Application.Email;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Email;
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
    IOptions<StripeSettings> stripeOptions,
    ILogger<BillingJobsHostedService> logger) : BackgroundService
{
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
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var billingService = scope.ServiceProvider.GetRequiredService<IBillingService>();
        var accessService = scope.ServiceProvider.GetRequiredService<ITenantAccessService>();

        var now = DateTimeOffset.UtcNow;
        var tenants = await db.Tenants.ToListAsync(cancellationToken);

        foreach (var tenant in tenants)
        {
            if (tenant.Status != TenantStatus.Active)
            {
                continue;
            }

            await ProcessTrialReminderAsync(tenant, db, emailSender, billingService, now, cancellationToken);
            await ProcessDelinquencyAsync(tenant, db, emailSender, now, cancellationToken);
            await ProcessDormancyAsync(tenant, db, emailSender, now, cancellationToken);
            await ApplyScheduledPlanIfDueAsync(tenant, db, now, cancellationToken);

            _ = accessService;
        }

        await db.SaveChangesAsync(cancellationToken);
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

    private async Task ProcessTrialReminderAsync(
        Tenant tenant,
        CohestraDbContext db,
        IEmailSender emailSender,
        IBillingService billingService,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary
            || tenant.BillingStatus != BillingStatus.Trialing
            || tenant.TrialEndsAt is not { } trialEnd
            || trialEnd <= now
            || trialEnd > now.AddDays(7))
        {
            return;
        }

        if (tenant.LastTrialReminderSentAt is { } last && last.Date == now.Date)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        string? portalUrl = null;
        if (stripeOptions.Value.IsConfigured && !string.IsNullOrWhiteSpace(tenant.StripeCustomerId))
        {
            try
            {
                var portal = await billingService.CreatePortalSessionAsync(
                    new CreatePortalSessionCommand(tenant.Id, "https://cohestra.app/settings/billing"),
                    cancellationToken);
                portalUrl = portal.PortalUrl;
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Portal session unavailable for trial reminder tenant {TenantId}", tenant.Id);
            }
        }

        var portalLine = portalUrl is null
            ? "Manage billing from Settings → Billing in your workspace."
            : $"Manage billing: {portalUrl}";

        await emailSender.SendAsync(
            new EmailMessage(
                tenant.AdminContactEmail,
                null,
                $"Trial ending soon — {tenant.Name}",
                $"Your Cohestra trial ends on {trialEnd:MMMM d, yyyy}. {portalLine}",
                $"<p>Your trial ends on <strong>{trialEnd:MMMM d, yyyy}</strong>.</p><p>{portalLine}</p>"),
            cancellationToken);

        tenant.LastTrialReminderSentAt = now;
    }

    private static async Task ProcessDelinquencyAsync(
        Tenant tenant,
        CohestraDbContext db,
        IEmailSender emailSender,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary || tenant.DelinquencyStartedAt is not { } started)
        {
            return;
        }

        var days = (int)Math.Floor((now - started).TotalDays) + 1;

        if (days >= 29 && tenant.Status == TenantStatus.Active)
        {
            tenant.Status = TenantStatus.Archived;
            tenant.ArchivedAt = now;
            tenant.UpdatedAt = now;
            return;
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
                return;
            }

            await SendBillingNoticeAsync(
                tenant,
                emailSender,
                "Payment past due",
                "Your last payment did not succeed. Update your payment method to keep full access.",
                cancellationToken);
            tenant.LastPastDueNoticeAt = now;
            return;
        }

        if (tenant.BillingStatus == BillingStatus.OnHold)
        {
            if (tenant.LastOnHoldNoticeAt is { } last && (now - last).TotalDays < 7)
            {
                return;
            }

            await SendBillingNoticeAsync(
                tenant,
                emailSender,
                "Workspace on hold",
                "Billing is on hold. The workspace is read-only until payment is restored.",
                cancellationToken);
            tenant.LastOnHoldNoticeAt = now;
        }
    }

    private static async Task ProcessDormancyAsync(
        Tenant tenant,
        CohestraDbContext db,
        IEmailSender emailSender,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (tenant.IsComplimentary
            || tenant.Plan is not TenantPlan.Basic
            || tenant.BillingStatus is not BillingStatus.Free)
        {
            return;
        }

        var lastActivity = tenant.LastActivityAt ?? tenant.CreatedAt;
        var idleDays = (int)Math.Floor((now - lastActivity).TotalDays);

        if (idleDays >= 90 && tenant.Status == TenantStatus.Active)
        {
            tenant.Status = TenantStatus.Archived;
            tenant.ArchivedAt = now;
            tenant.UpdatedAt = now;
            return;
        }

        if (idleDays >= 83)
        {
            if (tenant.LastDormancyWarningAt is not null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
            {
                return;
            }

            await emailSender.SendAsync(
                new EmailMessage(
                    tenant.AdminContactEmail,
                    null,
                    $"Inactive workspace — {tenant.Name}",
                    "Your free Basic workspace will archive in 7 days without admin activity or public registrations.",
                    "<p>Your free Basic workspace will archive in 7 days without admin activity or public registrations.</p>"),
                cancellationToken);

            tenant.LastDormancyWarningAt = now;
        }
    }

    private static async Task SendBillingNoticeAsync(
        Tenant tenant,
        IEmailSender emailSender,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        await emailSender.SendAsync(
            new EmailMessage(tenant.AdminContactEmail, null, subject, body, $"<p>{body}</p>"),
            cancellationToken);
    }
}
