using System.Text.Json;
using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class BillingEmailOwnershipTests
{
    private const string OwnerEmail = "owner@example.com";

    [Fact]
    public async Task A_Immediate_paid_plan_change_does_not_enqueue_cohestra_billing_confirmation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedPaid(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var outbox = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var service = PaddleBillingTestHarness.CreateService(db, client, outboxPublisher: outbox);

        var preview = await service.PreviewPlanChangeAsync(
            new PreviewPlanChangeCommand(tenant.Id, "studio", TenantPlan.Pro, BillingInterval.Annual));
        await service.ConfirmPlanChangeAsync(
            new ConfirmPlanChangeCommand(
                tenant.Id,
                "studio",
                TenantPlan.Pro,
                BillingInterval.Annual,
                preview.PreviewState,
                "https://studio.localhost/dashboard?billing=success",
                "https://studio.localhost/billing/checkout?canceled=1"));

        Assert.DoesNotContain(
            outbox.Messages,
            message => message.MessageType == OutboxMessageTypes.BillingNotification);
        Assert.Empty(db.OutboxMessages);
    }

    [Fact]
    public async Task B_Transaction_completed_does_not_enqueue_payment_receipt()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.AdminContactEmail = OwnerEmail;
        tenant.PaddleCustomerId = "ctm_1";
        await db.SaveChangesAsync();
        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_ok",
                Status = "active",
                CustomerId = "ctm_1",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
            },
        };
        var processor = new PaddleWebhookProcessor(
            db,
            new PaddleBillingTestHarness.NoopPublishedSiteCache(),
            Options.Create(new SiteLandingSeedSettings()),
            Options.Create(PaddleBillingTestHarness.DefaultSettings()),
            client,
            NullLogger<PaddleWebhookProcessor>.Instance);

        var result = await processor.ProcessAsync($$"""
            {
              "event_id": "evt_paid",
              "event_type": "transaction.completed",
              "data": {
                "id": "txn_paid",
                "status": "completed",
                "customer_id": "ctm_1",
                "subscription_id": "sub_ok",
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """);

        Assert.True(result.Processed);
        Assert.Empty(db.OutboxMessages.Where(row => row.MessageType == OutboxMessageTypes.BillingNotification));
    }

    [Fact]
    public void C_Scheduled_downgrade_keeps_usage_warning_without_paddle_financial_copy()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        var now = new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

        BillingNotificationComposer.EnqueueScheduledDowngradeConfirmation(
            publisher,
            tenant,
            TenantPlan.Core,
            BillingInterval.Monthly,
            intervalOnlyChange: false,
            now.AddDays(20),
            ["Communities: 4 used, Core allows 1."],
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);

        var message = ParseSingle(publisher);
        Assert.Equal(BillingNotificationNoticeTypes.ScheduledDowngrade, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("read-only", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Communities: 4 used, Core allows 1.", message.HtmlBody, StringComparison.Ordinal);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public void C_Scheduled_downgrade_reminder_keeps_usage_warning()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        var now = new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

        BillingNotificationComposer.EnqueueScheduledDowngradeReminder(
            publisher,
            tenant,
            TenantPlan.Core,
            now.AddDays(1),
            daysUntilSwitch: 1,
            ["Communities: 4 used, Core allows 1."],
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);

        var message = ParseSingle(publisher);
        Assert.Equal(BillingNotificationNoticeTypes.ScheduledDowngradeReminder, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("read-only", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Communities: 4 used, Core allows 1.", message.HtmlBody, StringComparison.Ordinal);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public void D_OnHold_access_impact_notification_remains()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        var now = DateTimeOffset.UtcNow;

        BillingNotificationComposer.EnqueueOnHold(publisher, tenant, now);

        var message = ParseSingle(publisher);
        Assert.Equal(BillingNotificationNoticeTypes.OnHold, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("read-only", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("payment did not succeed", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public void D_PastDue_is_access_impact_not_payment_receipt()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);

        BillingNotificationComposer.EnqueuePastDue(publisher, tenant, DateTimeOffset.UtcNow);

        var message = ParseSingle(publisher);
        Assert.Equal(BillingNotificationNoticeTypes.PastDue, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("access", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("payment did not succeed", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public void E_Dormancy_notification_remains()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Basic);

        BillingNotificationComposer.EnqueueDormancy(publisher, tenant, DateTimeOffset.UtcNow);

        var message = ParseSingle(publisher);
        Assert.Equal(BillingNotificationNoticeTypes.Dormancy, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("archive", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public void Empty_admin_contact_does_not_enqueue_or_count_as_sent()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        tenant.AdminContactEmail = " ";

        Assert.False(BillingNotificationComposer.EnqueuePastDue(publisher, tenant, DateTimeOffset.UtcNow));
        Assert.False(BillingNotificationComposer.EnqueueOnHold(publisher, tenant, DateTimeOffset.UtcNow));
        Assert.False(BillingNotificationComposer.EnqueueDormancy(publisher, tenant, DateTimeOffset.UtcNow));
        Assert.False(
            BillingNotificationComposer.EnqueueTrialReminder(
                publisher,
                tenant,
                DateTimeOffset.UtcNow.AddDays(3),
                new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
                DateTimeOffset.UtcNow));
        Assert.Empty(publisher.Messages);
    }

    [Fact]
    public void F_Retained_notifications_use_admin_contact_email()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        var now = DateTimeOffset.UtcNow;

        BillingNotificationComposer.EnqueueTrialReminder(
            publisher,
            tenant,
            now.AddDays(3),
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);
        BillingNotificationComposer.EnqueueScheduledDowngradeApplied(
            publisher,
            tenant,
            TenantPlan.Core,
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);

        Assert.Equal(2, publisher.Messages.Count);
        foreach (var payload in publisher.Messages.Select(item => Parse(item.PayloadJson)))
        {
            Assert.Equal(OwnerEmail, payload.ToEmail);
        }
    }

    [Fact]
    public void G_Applied_and_scheduled_copy_do_not_repeat_invoice_or_price()
    {
        var publisher = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var tenant = OwnerTenant(TenantPlan.Pro);
        var now = DateTimeOffset.UtcNow;

        BillingNotificationComposer.EnqueueScheduledDowngradeApplied(
            publisher,
            tenant,
            TenantPlan.Core,
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);

        var applied = Parse(publisher.Messages[0].PayloadJson);
        Assert.Contains("now on the Core plan", applied.PlainBody, StringComparison.Ordinal);
        AssertNoProviderFinancialCopy(applied);
    }

    [Fact]
    public async Task Deferred_interval_change_enqueues_operational_schedule_notice_only()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedPaid(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        var outbox = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var service = PaddleBillingTestHarness.CreateService(db, client, outboxPublisher: outbox);

        var session = await service.CreateCheckoutSessionAsync(
            new CreateCheckoutSessionCommand(
                tenant.Id,
                "studio",
                TenantPlan.Pro,
                BillingInterval.Monthly,
                OwnerEmail,
                "https://studio.localhost/dashboard?billing=success",
                "https://studio.localhost/billing/checkout?canceled=1"));

        Assert.True(session.CompletedInApp);
        var message = ParseSingle(outbox);
        Assert.Equal(BillingNotificationNoticeTypes.ScheduledDowngrade, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("yearly to monthly", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        AssertNoProviderFinancialCopy(message);
    }

    [Fact]
    public async Task Confirm_deferred_downgrade_enqueues_operational_notice_not_receipt()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedPaid(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var outbox = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var service = PaddleBillingTestHarness.CreateService(db, client, outboxPublisher: outbox);

        var result = await service.ConfirmPlanChangeAsync(
            new ConfirmPlanChangeCommand(
                tenant.Id,
                "studio",
                TenantPlan.Core,
                BillingInterval.Monthly,
                PreviewState: null,
                "https://studio.localhost/dashboard?billing=success",
                "https://studio.localhost/billing/checkout?canceled=1"));

        Assert.True(result.CompletedInApp);
        var message = ParseSingle(outbox);
        Assert.Equal(BillingNotificationNoticeTypes.ScheduledDowngrade, message.NoticeType);
        Assert.Equal(OwnerEmail, message.ToEmail);
        Assert.Contains("keep Pro access", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        AssertNoProviderFinancialCopy(message);
    }

    private static Tenant OwnerTenant(TenantPlan plan) =>
        new()
        {
            Id = Guid.NewGuid(),
            Slug = "studio",
            Name = "Studio",
            Plan = plan,
            AdminContactEmail = OwnerEmail,
        };

    private static (Tenant Tenant, FakePaddleApiClient Client) SeedPaid(
        CohestraDbContext db,
        TenantPlan plan,
        BillingInterval interval,
        string paddleStatus)
    {
        var tenant = PaddleBillingTestHarness.SeedTenant(db, plan);
        tenant.AdminContactEmail = OwnerEmail;
        tenant.BillingStatus = BillingStatus.Active;
        tenant.BillingInterval = interval;
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_existing";
        tenant.HasConsumedTrial = true;
        db.SaveChanges();

        var priceId = TenantBillingPlanSync.ResolvePriceId(plan, interval, PaddleBillingTestHarness.DefaultSettings())!;
        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_existing",
                Status = paddleStatus,
                CustomerId = "ctm_test",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = priceId } }],
                CurrentBillingPeriod = new PaddleTimePeriod
                {
                    StartsAt = DateTimeOffset.UtcNow.AddDays(-10),
                    EndsAt = DateTimeOffset.UtcNow.AddDays(20),
                },
            },
        };
        return (tenant, client);
    }

    private static BillingNotificationOutboxPayload ParseSingle(
        PaddleBillingTestHarness.CapturingOutboxPublisher publisher)
    {
        var row = Assert.Single(publisher.Messages);
        Assert.Equal(OutboxMessageTypes.BillingNotification, row.MessageType);
        return Parse(row.PayloadJson);
    }

    private static BillingNotificationOutboxPayload Parse(string payload) =>
        JsonSerializer.Deserialize<BillingNotificationOutboxPayload>(payload)
        ?? throw new InvalidOperationException("Payload was not deserializable.");

    private static void AssertNoProviderFinancialCopy(BillingNotificationOutboxPayload message)
    {
        foreach (var text in new[] { message.Subject, message.PlainBody, message.HtmlBody })
        {
            Assert.DoesNotContain("invoice", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("No charge today", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("billed at the new price", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("payment did not succeed", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("proration", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("tax", text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("$", text, StringComparison.Ordinal);
        }
    }
}
