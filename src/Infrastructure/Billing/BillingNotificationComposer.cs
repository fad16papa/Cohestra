using System.Text;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Billing;

internal static class BillingNotificationComposer
{
    internal static void EnqueueScheduledDowngradeConfirmation(
        IOutboxPublisher outboxPublisher,
        Tenant tenant,
        TenantPlan targetPlan,
        DateTimeOffset effectiveAt,
        IReadOnlyList<string> limitWarnings,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        var billingUrl = BuildBillingUrl(publicWebOptions, tenant.Slug);
        var currentPlan = tenant.Plan.ToString();
        var targetPlanName = targetPlan.ToString();
        var effectiveLabel = effectiveAt.ToString("MMMM d, yyyy");

        var plain = new StringBuilder();
        plain.Append(
            $"Your {tenant.Name} workspace plan will change from {currentPlan} to {targetPlanName} on {effectiveLabel}. ");
        plain.Append($"You keep {currentPlan} access until then. ");
        plain.Append("No charge today — your saved payment method will be billed at the new plan price from that date. ");
        plain.Append($"Manage billing at {billingUrl}.");

        var html = new StringBuilder();
        html.Append("<p>Your workspace plan will change from <strong>");
        html.Append(currentPlan);
        html.Append("</strong> to <strong>");
        html.Append(targetPlanName);
        html.Append("</strong> on <strong>");
        html.Append(effectiveLabel);
        html.Append("</strong>.</p><p>You keep ");
        html.Append(currentPlan);
        html.Append(" access until then. No charge today — your saved payment method will be billed at the new plan price from that date.</p>");
        html.Append("<p><a href=\"");
        html.Append(billingUrl);
        html.Append("\">Manage billing</a></p>");

        AppendLimitWarningCopy(plain, html, limitWarnings);

        Enqueue(
            outboxPublisher,
            tenant,
            BillingNotificationNoticeTypes.ScheduledDowngrade,
            $"Plan change scheduled — {tenant.Name}",
            plain.ToString(),
            html.ToString(),
            $"billing:scheduled-downgrade:{tenant.Id}:{effectiveAt:yyyy-MM-dd}:{targetPlan}",
            now);
    }

    internal static void EnqueueScheduledDowngradeReminder(
        IOutboxPublisher outboxPublisher,
        Tenant tenant,
        TenantPlan targetPlan,
        DateTimeOffset effectiveAt,
        int daysUntilSwitch,
        IReadOnlyList<string> limitWarnings,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        var billingUrl = BuildBillingUrl(publicWebOptions, tenant.Slug);
        var targetPlanName = targetPlan.ToString();
        var effectiveLabel = effectiveAt.ToString("MMMM d, yyyy");
        var dayLabel = daysUntilSwitch == 1 ? "tomorrow" : $"in {daysUntilSwitch} days";

        var plain = new StringBuilder();
        plain.Append(
            $"Reminder: your {tenant.Name} workspace switches to {targetPlanName} {dayLabel} ({effectiveLabel}). ");
        plain.Append($"Manage billing at {billingUrl}.");

        var html = new StringBuilder();
        html.Append("<p>Reminder: your workspace switches to <strong>");
        html.Append(targetPlanName);
        html.Append("</strong> ");
        html.Append(dayLabel);
        html.Append(" (<strong>");
        html.Append(effectiveLabel);
        html.Append("</strong>).</p>");
        html.Append("<p><a href=\"");
        html.Append(billingUrl);
        html.Append("\">Manage billing</a></p>");

        AppendLimitWarningCopy(plain, html, limitWarnings);

        Enqueue(
            outboxPublisher,
            tenant,
            BillingNotificationNoticeTypes.ScheduledDowngradeReminder,
            $"Plan switch {dayLabel} — {tenant.Name}",
            plain.ToString(),
            html.ToString(),
            $"billing:downgrade-reminder-{daysUntilSwitch}d:{tenant.Id}:{effectiveAt:yyyy-MM-dd}",
            now);
    }

    internal static void EnqueueScheduledDowngradeApplied(
        IOutboxPublisher outboxPublisher,
        Tenant tenant,
        TenantPlan appliedPlan,
        PublicWebOptions publicWebOptions,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return;
        }

        var billingUrl = BuildBillingUrl(publicWebOptions, tenant.Slug);
        var planName = appliedPlan.ToString();

        var plain =
            $"Your {tenant.Name} workspace is now on the {planName} plan. "
            + $"Your next invoice will reflect the {planName} price. "
            + $"Manage billing at {billingUrl}.";

        var html =
            $"<p>Your workspace is now on the <strong>{planName}</strong> plan.</p>"
            + $"<p>Your next invoice will reflect the {planName} price.</p>"
            + $"<p><a href=\"{billingUrl}\">Manage billing</a></p>";

        Enqueue(
            outboxPublisher,
            tenant,
            BillingNotificationNoticeTypes.ScheduledDowngradeApplied,
            $"Plan updated to {planName} — {tenant.Name}",
            plain,
            html,
            $"billing:downgrade-applied:{tenant.Id}:{now:yyyy-MM-dd}:{appliedPlan}",
            now);
    }

    internal static int? ResolveScheduledDowngradeReminderDays(DateTimeOffset now, DateTimeOffset effectiveAt)
    {
        if (effectiveAt <= now)
        {
            return null;
        }

        var daysUntil = (effectiveAt.Date - now.Date).Days;
        return daysUntil is 7 or 1 ? daysUntil : null;
    }

    internal static bool HasScheduledPaidDowngrade(Tenant tenant) =>
        tenant.ScheduledPlan is TenantPlan.Core or TenantPlan.Pro
        && tenant.ScheduledPlanEffectiveAt is not null
        && tenant.ScheduledPlanEffectiveAt > DateTimeOffset.UtcNow;

    private static void AppendLimitWarningCopy(
        StringBuilder plain,
        StringBuilder html,
        IReadOnlyList<string> limitWarnings)
    {
        if (limitWarnings.Count == 0)
        {
            return;
        }

        plain.Append(" Your current usage exceeds the upcoming plan limits — reduce usage before the switch date or your workspace may become read-only.");
        html.Append("<p><strong>Your current usage exceeds the upcoming plan limits.</strong> Reduce usage before the switch date or your workspace may become read-only.</p><ul>");
        foreach (var warning in limitWarnings)
        {
            html.Append("<li>");
            html.Append(System.Net.WebUtility.HtmlEncode(warning));
            html.Append("</li>");
        }

        html.Append("</ul>");
    }

    private static string BuildBillingUrl(PublicWebOptions publicWebOptions, string slug) =>
        TenantPublicWebUrlBuilder.BuildTenantPath(publicWebOptions.BaseUrl, slug, "/settings/billing");

    private static void Enqueue(
        IOutboxPublisher outboxPublisher,
        Tenant tenant,
        string noticeType,
        string subject,
        string plainBody,
        string htmlBody,
        string dedupeKey,
        DateTimeOffset now)
    {
        var payload = System.Text.Json.JsonSerializer.Serialize(new BillingNotificationOutboxPayload(
            tenant.Id,
            noticeType,
            tenant.AdminContactEmail!.Trim(),
            subject,
            plainBody,
            htmlBody));

        outboxPublisher.Enqueue(
            tenant.Id,
            OutboxMessageTypes.BillingNotification,
            payload,
            dedupeKey);
    }
}
