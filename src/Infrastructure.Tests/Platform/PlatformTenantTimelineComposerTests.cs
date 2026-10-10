using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformTenantTimelineComposerTests
{
    private static readonly DateTimeOffset SameInstant = DateTimeOffset.Parse("2026-10-09T12:00:00Z");

    [Fact]
    public void MapAudit_omits_details_and_sanitizes_reason()
    {
        var item = PlatformTenantTimelineComposer.MapAudit(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            PlatformAuditAction.TenantSuspended,
            "Password=AUDIT_DETAILS_SECRET_44_6 victim@example.com",
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            "actor@cohestra.local",
            SameInstant);

        Assert.Equal("audit", item.Type);
        Assert.Equal(PlatformTenantTimelineProvenance.PlatformAuditLogs, item.Provenance);
        Assert.Equal("audit:11111111-1111-1111-1111-111111111111", item.Id);
        Assert.DoesNotContain("AUDIT_DETAILS_SECRET_44_6", item.Summary, StringComparison.Ordinal);
        Assert.DoesNotContain("victim@example.com", item.Summary, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("TenantSuspended", item.Summary, StringComparison.Ordinal);
        Assert.Equal("actor@cohestra.local", item.Metadata["actorEmail"]);
        Assert.Null(item.GetType().GetProperty("DetailsJson"));
    }

    [Fact]
    public void MapSupport_uses_milestones_not_bodies()
    {
        var opened = PlatformTenantTimelineComposer.MapSupportOpened(
            Guid.CreateVersion7(),
            "SUP-123",
            SupportIssueStatus.WaitingOnOperator,
            SameInstant);
        var reply = PlatformTenantTimelineComposer.MapSupportReply(
            Guid.CreateVersion7(),
            "SUP-123",
            SameInstant.AddMinutes(1));

        Assert.Equal("Support issue SUP-123 opened", opened.Summary);
        Assert.Equal("Support reply recorded for SUP-123", reply.Summary);
        Assert.Equal("opened", opened.Metadata["milestone"]);
        Assert.Equal("reply_recorded", reply.Metadata["milestone"]);
        Assert.Equal(PlatformTenantTimelineProvenance.SupportIssues, opened.Provenance);
        Assert.DoesNotContain("SUPPORT_BODY", opened.Summary, StringComparison.Ordinal);
    }

    [Fact]
    public void MapOutbox_reuses_sanitized_error_and_omits_payload_fields()
    {
        var item = PlatformTenantTimelineComposer.MapOutbox(
            Guid.CreateVersion7(),
            OutboxMessageTypes.CampaignRecipient,
            OutboxMessageStatus.Failed,
            4,
            SameInstant,
            null,
            null,
            "Password=OUTBOX_PAYLOAD_SECRET_44_6\nat System.Fail()");

        Assert.Equal("outbox", item.Type);
        Assert.Equal(PlatformTenantTimelineProvenance.OutboxMessages, item.Provenance);
        Assert.Contains("Failed", item.Summary, StringComparison.Ordinal);
        Assert.DoesNotContain("OUTBOX_PAYLOAD_SECRET_44_6", item.Summary, StringComparison.Ordinal);
        Assert.DoesNotContain("OUTBOX_PAYLOAD_SECRET_44_6", item.Metadata["lastErrorSanitized"], StringComparison.Ordinal);
        Assert.DoesNotContain("at System.Fail()", item.Metadata["lastErrorSanitized"], StringComparison.Ordinal);
        Assert.Null(item.GetType().GetProperty("PayloadJson"));
        Assert.Null(item.GetType().GetProperty("LastError"));
        Assert.Null(item.GetType().GetProperty("DedupeKey"));
    }

    [Fact]
    public void MapPaddle_uses_44_5_safe_fields_only()
    {
        var item = PlatformTenantTimelineComposer.MapPaddle(
            Guid.CreateVersion7(),
            "transaction.completed",
            PaddleWebhookDeliveryDisposition.Processed,
            200,
            "Processed.",
            SameInstant);

        Assert.Equal("paddle", item.Type);
        Assert.Equal(PlatformTenantTimelineProvenance.PaddleWebhookDeliveries, item.Provenance);
        Assert.Equal("Paddle transaction.completed Processed", item.Summary);
        Assert.Equal("200", item.Metadata["httpStatus"]);
        Assert.Null(item.GetType().GetProperty("Body"));
        Assert.Null(item.GetType().GetProperty("Signature"));
    }

    [Fact]
    public void MapBillingSnapshot_uses_observedAt_and_current_state_kind()
    {
        var tenantId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var observedAt = DateTimeOffset.Parse("2026-10-10T01:00:00Z");
        var item = PlatformTenantTimelineComposer.MapBillingSnapshot(
            tenantId,
            TenantPlan.Core,
            TenantStatus.Active,
            BillingStatus.Free,
            true,
            observedAt);

        Assert.Equal("billing_snapshot", item.Type);
        Assert.Equal(PlatformTenantTimelineProvenance.TenantBillingSnapshot, item.Provenance);
        Assert.Equal(observedAt, item.Timestamp);
        Assert.Equal($"billing-snapshot:{tenantId:D}", item.Id);
        Assert.Equal("current_snapshot", item.Metadata["kind"]);
        Assert.Contains("Sponsored", item.Summary, StringComparison.Ordinal);
        Assert.Contains("Core", item.Summary, StringComparison.Ordinal);
    }

    [Fact]
    public void Merge_is_newest_first_then_type_then_id()
    {
        var older = SameInstant.AddMinutes(-5);
        var a = Item("audit:z", "audit", SameInstant);
        var b = Item("audit:a", "audit", SameInstant);
        var c = Item("outbox:1", "outbox", SameInstant);
        var d = Item("audit:old", "audit", older);

        var merged = PlatformTenantTimelineComposer.Merge([d, c, a, b]);

        Assert.Equal(["audit:a", "audit:z", "outbox:1", "audit:old"], merged.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void Merge_caps_at_fifty()
    {
        var items = Enumerable.Range(0, 80).Select(index =>
            Item($"audit:{index:D3}", "audit", SameInstant.AddMinutes(index)));

        var merged = PlatformTenantTimelineComposer.Merge(items);

        Assert.Equal(50, merged.Count);
        Assert.Equal("audit:079", merged[0].Id);
        Assert.Equal("audit:030", merged[^1].Id);
    }

    [Fact]
    public void SourceStatus_marks_empty_paddle_as_missing_instrumentation()
    {
        var paddle = PlatformTenantTimelineComposer.SourceStatus(
            PlatformTenantTimelineProvenance.PaddleWebhookDeliveries,
            0,
            missingInstrumentationWhenEmpty: true);
        var audit = PlatformTenantTimelineComposer.SourceStatus(
            PlatformTenantTimelineProvenance.PlatformAuditLogs,
            0);

        Assert.Equal(PlatformTenantTimelineSourceStates.MissingInstrumentation, paddle.State);
        Assert.Equal(PlatformTenantTimelineSourceStates.Empty, audit.State);
    }

    private static PlatformTenantTimelineItem Item(string id, string type, DateTimeOffset timestamp) =>
        new(id, type, timestamp, "test", "summary", new Dictionary<string, string?>());
}
