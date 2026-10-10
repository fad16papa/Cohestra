using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformTenantTimelineServiceTests
{
    [Fact]
    public async Task Get_unknown_tenant_is_not_found()
    {
        await using var db = CreateDb();
        var result = await new PlatformTenantTimelineService(db).GetAsync(Guid.CreateVersion7());

        Assert.False(result.Succeeded);
        Assert.Equal(PlatformTenantError.NotFound, result.Error);
    }

    [Fact]
    public async Task Get_isolates_tenant_and_excludes_null_paddle()
    {
        await using var db = CreateDb();
        var tenantA = SeedTenant(db, "alpha", TenantPlan.Core, BillingStatus.Active);
        var tenantB = SeedTenant(db, "bravo", TenantPlan.Pro, BillingStatus.PastDue);
        var now = DateTimeOffset.Parse("2026-10-09T15:00:00Z");

        db.PlatformAuditLogs.AddRange(
            Audit(tenantA.Id, now.AddMinutes(-1), "AUDIT_DETAILS_SECRET_44_6"),
            Audit(tenantB.Id, now, "TENANT_B_AUDIT"));
        db.SupportIssues.AddRange(
            Issue(tenantA.Id, "SUP-A", now.AddMinutes(-2), "SUPPORT_BODY_SECRET_44_6"),
            Issue(tenantB.Id, "SUP-B", now, "TENANT_B_SUPPORT"));
        db.OutboxMessages.AddRange(
            Outbox(tenantA.Id, now.AddMinutes(-3), "OUTBOX_PAYLOAD_SECRET_44_6"),
            Outbox(tenantB.Id, now, "TENANT_B_OUTBOX"));
        db.PaddleWebhookDeliveries.AddRange(
            Paddle(tenantA.Id, now.AddMinutes(-4), "evt-a"),
            Paddle(tenantB.Id, now, "evt-b"),
            Paddle(null, now, "evt-null"));
        await db.SaveChangesAsync();

        var result = await new PlatformTenantTimelineService(db).GetAsync(tenantA.Id);
        Assert.True(result.Succeeded);
        var timeline = result.Value!;
        Assert.True(timeline.HasHistoricalEvents);
        Assert.Equal(tenantA.Id, timeline.TenantId);
        Assert.Contains(timeline.Items, item => item.Type == "billing_snapshot");
        Assert.Contains(timeline.Items, item => item.Type == "audit");
        Assert.Contains(timeline.Items, item => item.Type == "support");
        Assert.Contains(timeline.Items, item => item.Type == "outbox");
        Assert.Contains(timeline.Items, item => item.Type == "paddle");
        Assert.DoesNotContain(timeline.Items, item => item.Summary.Contains("TENANT_B", StringComparison.Ordinal));
        Assert.DoesNotContain(timeline.Items, item => item.Id.Contains("evt-null", StringComparison.Ordinal));
        Assert.DoesNotContain(timeline.Items, item => item.Summary.Contains("SUP-B", StringComparison.Ordinal));
        Assert.Equal(
            PlatformTenantTimelineSourceStates.Present,
            timeline.Sources.Single(source => source.Source == PlatformTenantTimelineProvenance.PaddleWebhookDeliveries).State);
    }

    [Fact]
    public async Task Get_empty_sources_are_truthful_and_include_current_snapshot()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db, "empty", TenantPlan.Basic, BillingStatus.Free);
        await db.SaveChangesAsync();

        var result = await new PlatformTenantTimelineService(db).GetAsync(tenant.Id);
        Assert.True(result.Succeeded);
        var timeline = result.Value!;
        Assert.False(timeline.HasHistoricalEvents);
        var snapshot = Assert.Single(timeline.Items);
        Assert.Equal("billing_snapshot", snapshot.Type);
        Assert.Equal(timeline.ObservedAt, snapshot.Timestamp);
        Assert.Equal(
            PlatformTenantTimelineSourceStates.MissingInstrumentation,
            timeline.Sources.Single(source => source.Source == PlatformTenantTimelineProvenance.PaddleWebhookDeliveries).State);
        Assert.Equal(
            PlatformTenantTimelineSourceStates.Empty,
            timeline.Sources.Single(source => source.Source == PlatformTenantTimelineProvenance.PlatformAuditLogs).State);
    }

    [Fact]
    public async Task Get_bounds_each_source_and_merged_result()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db, "busy", TenantPlan.Pro, BillingStatus.Active);
        var start = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        for (var i = 0; i < 40; i++)
        {
            db.PlatformAuditLogs.Add(Audit(tenant.Id, start.AddMinutes(i), $"detail-{i}"));
            db.OutboxMessages.Add(Outbox(tenant.Id, start.AddMinutes(i), $"payload-{i}"));
        }

        await db.SaveChangesAsync();
        var result = await new PlatformTenantTimelineService(db).GetAsync(tenant.Id);
        Assert.True(result.Succeeded);
        Assert.True(result.Value!.Items.Count <= PlatformTenantTimelineComposer.MergedCap);
        Assert.Equal(
            PlatformTenantTimelineComposer.PerSourceTake,
            result.Value.Sources.Single(source => source.Source == PlatformTenantTimelineProvenance.PlatformAuditLogs).ItemCount);
        Assert.Equal(
            PlatformTenantTimelineComposer.PerSourceTake,
            result.Value.Sources.Single(source => source.Source == PlatformTenantTimelineProvenance.OutboxMessages).ItemCount);
    }

    [Fact]
    public async Task Get_does_not_invent_support_status_history()
    {
        await using var db = CreateDb();
        var tenant = SeedTenant(db, "support", TenantPlan.Core, BillingStatus.Free);
        var issue = Issue(tenant.Id, "SUP20261010000001", DateTimeOffset.Parse("2026-10-01T00:00:00Z"), "SUPPORT_BODY_SECRET_44_6");
        issue.Status = SupportIssueStatus.WaitingOnOperator;
        issue.UpdatedAt = DateTimeOffset.Parse("2026-10-08T00:00:00Z");
        db.SupportIssues.Add(issue);
        db.SupportIssueReplies.Add(new SupportIssueReply
        {
            Id = Guid.CreateVersion7(),
            SupportIssueId = issue.Id,
            ActorUserId = Guid.CreateVersion7(),
            ActorEmail = "filer@example.com",
            Body = "SUPPORT_BODY_SECRET_44_6 please help",
            CreatedAt = DateTimeOffset.Parse("2026-10-02T00:00:00Z"),
        });
        await db.SaveChangesAsync();

        var result = await new PlatformTenantTimelineService(db).GetAsync(tenant.Id);
        var support = result.Value!.Items.Where(item => item.Type == "support").ToList();
        Assert.Equal(2, support.Count);
        Assert.Contains(support, item => item.Metadata["milestone"] == "opened");
        Assert.Contains(support, item => item.Metadata["milestone"] == "reply_recorded");
        Assert.DoesNotContain(result.Value.Items, item => item.Summary.Contains("WaitingOnOperator", StringComparison.Ordinal)
            && item.Type == "support"
            && item.Metadata.GetValueOrDefault("milestone") == "status_changed");
        Assert.DoesNotContain(
            result.Value.Items,
            item => item.Summary.Contains("SUPPORT_BODY_SECRET_44_6", StringComparison.Ordinal));
    }

    private static Tenant SeedTenant(CohestraDbContext db, string slug, TenantPlan plan, BillingStatus billing)
    {
        var tenant = new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = slug,
            Name = slug,
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = billing,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2020-01-01T00:00:00Z"),
        };
        db.Tenants.Add(tenant);
        return tenant;
    }

    private static PlatformAuditLog Audit(Guid tenantId, DateTimeOffset createdAt, string details) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = Guid.CreateVersion7(),
            ActorEmail = "platform@cohestra.local",
            TenantId = tenantId,
            Action = PlatformAuditAction.TenantCreated,
            Reason = "seed",
            DetailsJson = details,
            CreatedAt = createdAt,
        };

    private static SupportIssue Issue(Guid tenantId, string number, DateTimeOffset createdAt, string body) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            IssueNumber = number,
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = body,
            Description = body,
            InternalNote = body,
            OperatorEmail = "op@example.com",
            OperatorDisplayName = "Op",
            TenantSlug = "slug",
            TenantName = "Name",
            Status = SupportIssueStatus.Open,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

    private static OutboxMessage Outbox(Guid tenantId, DateTimeOffset createdAt, string payload) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            MessageType = OutboxMessageTypes.CampaignRecipient,
            PayloadJson = payload,
            DedupeKey = $"dedupe-{payload}",
            Status = OutboxMessageStatus.Failed,
            AttemptCount = 3,
            CreatedAt = createdAt,
            NextAttemptAt = createdAt,
            LastError = $"Password={payload}",
        };

    private static PaddleWebhookDelivery Paddle(Guid? tenantId, DateTimeOffset observedAt, string eventId) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            EventId = eventId,
            EventType = "transaction.completed",
            Disposition = PaddleWebhookDeliveryDisposition.Processed,
            TenantId = tenantId,
            HttpStatus = 200,
            DetailSanitized = "Processed.",
            ObservedAt = observedAt,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
