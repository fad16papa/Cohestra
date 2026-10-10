using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Platform;

public static class PlatformTenantTimelineComposer
{
    public const int PerSourceTake = 25;
    public const int MergedCap = 50;

    public static PlatformTenantTimelineItem MapAudit(
        Guid id,
        PlatformAuditAction action,
        string? reason,
        Guid actorUserId,
        string? actorEmail,
        DateTimeOffset createdAt)
    {
        var actionName = action.ToString();
        var sanitizedReason = PlatformHealthDescriptionSanitizer.Sanitize(reason);
        var summary = sanitizedReason is null
            ? $"Platform audit {actionName}"
            : $"Platform audit {actionName}: {sanitizedReason}";

        return new PlatformTenantTimelineItem(
            $"audit:{id:D}",
            PlatformTenantTimelineTypes.Audit,
            createdAt,
            PlatformTenantTimelineProvenance.PlatformAuditLogs,
            summary,
            new Dictionary<string, string?>(StringComparer.Ordinal)
            {
                ["action"] = actionName,
                ["actorUserId"] = actorUserId.ToString("D"),
                ["actorEmail"] = actorEmail,
            });
    }

    public static PlatformTenantTimelineItem MapSupportOpened(
        Guid id,
        string issueNumber,
        SupportIssueStatus status,
        DateTimeOffset createdAt)
    {
        return new PlatformTenantTimelineItem(
            $"support:{id:D}",
            PlatformTenantTimelineTypes.Support,
            createdAt,
            PlatformTenantTimelineProvenance.SupportIssues,
            $"Support issue {issueNumber} opened",
            new Dictionary<string, string?>(StringComparer.Ordinal)
            {
                ["issueNumber"] = issueNumber,
                ["status"] = status.ToString(),
                ["milestone"] = "opened",
            });
    }

    public static PlatformTenantTimelineItem MapSupportReply(
        Guid replyId,
        string issueNumber,
        DateTimeOffset createdAt)
    {
        return new PlatformTenantTimelineItem(
            $"support-reply:{replyId:D}",
            PlatformTenantTimelineTypes.Support,
            createdAt,
            PlatformTenantTimelineProvenance.SupportIssues,
            $"Support reply recorded for {issueNumber}",
            new Dictionary<string, string?>(StringComparer.Ordinal)
            {
                ["issueNumber"] = issueNumber,
                ["milestone"] = "reply_recorded",
            });
    }

    public static PlatformTenantTimelineItem MapOutbox(
        Guid id,
        string messageType,
        OutboxMessageStatus status,
        int attemptCount,
        DateTimeOffset createdAt,
        DateTimeOffset? processedAt,
        DateTimeOffset? dispatchedAt,
        string? lastError)
    {
        var lastErrorSanitized = PlatformHealthDescriptionSanitizer.Sanitize(lastError);
        var metadata = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["messageType"] = messageType,
            ["status"] = status.ToString(),
            ["attemptCount"] = attemptCount.ToString(),
        };
        if (processedAt is { } processed)
        {
            metadata["processedAt"] = processed.ToString("O");
        }

        if (dispatchedAt is { } dispatched)
        {
            metadata["dispatchedAt"] = dispatched.ToString("O");
        }

        if (lastErrorSanitized is not null)
        {
            metadata["lastErrorSanitized"] = lastErrorSanitized;
        }

        return new PlatformTenantTimelineItem(
            $"outbox:{id:D}",
            PlatformTenantTimelineTypes.Outbox,
            createdAt,
            PlatformTenantTimelineProvenance.OutboxMessages,
            $"Outbox {messageType} is {status}",
            metadata);
    }

    public static PlatformTenantTimelineItem MapPaddle(
        Guid id,
        string? eventType,
        PaddleWebhookDeliveryDisposition disposition,
        int httpStatus,
        string? detailSanitized,
        DateTimeOffset observedAt)
    {
        var typeLabel = string.IsNullOrWhiteSpace(eventType) ? "delivery" : eventType.Trim();
        var metadata = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["eventType"] = string.IsNullOrWhiteSpace(eventType) ? null : eventType.Trim(),
            ["disposition"] = disposition.ToString(),
            ["httpStatus"] = httpStatus.ToString(),
        };
        if (!string.IsNullOrWhiteSpace(detailSanitized))
        {
            metadata["detailSanitized"] = detailSanitized;
        }

        return new PlatformTenantTimelineItem(
            $"paddle:{id:D}",
            PlatformTenantTimelineTypes.Paddle,
            observedAt,
            PlatformTenantTimelineProvenance.PaddleWebhookDeliveries,
            $"Paddle {typeLabel} {disposition}",
            metadata);
    }

    public static PlatformTenantTimelineItem MapBillingSnapshot(
        Guid tenantId,
        TenantPlan plan,
        TenantStatus status,
        BillingStatus billingStatus,
        bool isComplimentary,
        DateTimeOffset observedAt)
    {
        var complimentary = isComplimentary ? " · Sponsored" : string.Empty;
        return new PlatformTenantTimelineItem(
            $"billing-snapshot:{tenantId:D}",
            PlatformTenantTimelineTypes.BillingSnapshot,
            observedAt,
            PlatformTenantTimelineProvenance.TenantBillingSnapshot,
            $"Current billing snapshot: {plan} / {status} / {billingStatus}{complimentary}",
            new Dictionary<string, string?>(StringComparer.Ordinal)
            {
                ["plan"] = plan.ToString(),
                ["status"] = status.ToString(),
                ["billingStatus"] = billingStatus.ToString(),
                ["isComplimentary"] = isComplimentary ? "true" : "false",
                ["kind"] = "current_snapshot",
            });
    }

    public static IReadOnlyList<PlatformTenantTimelineItem> Merge(
        IEnumerable<PlatformTenantTimelineItem> items,
        int cap = MergedCap)
    {
        var limit = cap < 1 ? MergedCap : cap;
        return items
            .OrderByDescending(item => item.Timestamp)
            .ThenBy(item => item.Type, StringComparer.Ordinal)
            .ThenBy(item => item.Id, StringComparer.Ordinal)
            .Take(limit)
            .ToList();
    }

    public static PlatformTenantTimelineSourceStatus SourceStatus(
        string source,
        int itemCount,
        bool missingInstrumentationWhenEmpty = false)
    {
        if (itemCount > 0)
        {
            return new PlatformTenantTimelineSourceStatus(
                source,
                PlatformTenantTimelineSourceStates.Present,
                itemCount);
        }

        return new PlatformTenantTimelineSourceStatus(
            source,
            missingInstrumentationWhenEmpty
                ? PlatformTenantTimelineSourceStates.MissingInstrumentation
                : PlatformTenantTimelineSourceStates.Empty,
            0);
    }
}
