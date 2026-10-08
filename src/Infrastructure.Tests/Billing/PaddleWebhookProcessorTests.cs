using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Seed;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookProcessorTests
{
    [Fact]
    public async Task ProcessAsync_missing_event_id_is_invalid()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var processor = CreateProcessor(db, new FakePaddleApiClient());

        var result = await processor.ProcessAsync("""{"event_type":"subscription.updated","data":{}}""");

        Assert.False(result.Processed);
        Assert.Equal("Missing event id.", result.Detail);
        Assert.Equal(PaddleWebhookDisposition.Invalid, result.Disposition);
    }

    [Fact]
    public async Task ProcessAsync_subscription_created_unlocks_plan()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = new FakePaddleApiClient();
        var processor = CreateProcessor(db, client);
        var payload = $$"""
            {
              "event_id": "evt_sub_1",
              "event_type": "subscription.created",
              "data": {
                "id": "sub_1",
                "status": "trialing",
                "customer_id": "ctm_new",
                "items": [{ "quantity": 1, "price": { "id": "pri_core_m" } }],
                "trial_dates": { "starts_at": "2030-01-01T00:00:00Z", "ends_at": "2030-01-31T00:00:00Z" },
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Core, updated.Plan);
        Assert.Equal(BillingStatus.Trialing, updated.BillingStatus);
        Assert.True(updated.HasConsumedTrial);
    }

    [Fact]
    public async Task ProcessAsync_duplicate_event_id_is_ignored()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = $$"""
            {
              "event_id": "evt_dup",
              "event_type": "subscription.updated",
              "data": {
                "id": "sub_1",
                "status": "active",
                "customer_id": "ctm_new",
                "items": [{ "quantity": 1, "price": { "id": "pri_core_m" } }],
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """;

        var first = await processor.ProcessAsync(payload);
        var second = await processor.ProcessAsync(payload);

        Assert.True(first.Processed);
        Assert.Equal(PaddleWebhookDisposition.Processed, first.Disposition);
        Assert.True(second.Duplicate);
        Assert.False(second.Processed);
        Assert.Equal(PaddleWebhookDisposition.Duplicate, second.Disposition);
        Assert.Single(db.PaddleWebhookEvents);
    }

    [Fact]
    public async Task ProcessAsync_payment_failed_starts_pastdue()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_1";
        tenant.PaddleSubscriptionId = "sub_1";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = $$"""
            {
              "event_id": "evt_fail",
              "event_type": "transaction.payment_failed",
              "data": {
                "id": "txn_fail",
                "status": "past_due",
                "customer_id": "ctm_1",
                "subscription_id": "sub_1"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(BillingStatus.PastDue, updated.BillingStatus);
        Assert.NotNull(updated.DelinquencyStartedAt);
    }

    [Fact]
    public async Task ProcessAsync_subscription_canceled_returns_basic()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Canceled);
        tenant.PaddleSubscriptionId = "sub_gone";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_cancel",
              "event_type": "subscription.canceled",
              "data": { "id": "sub_gone", "status": "canceled", "customer_id": "ctm_1" }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Basic, updated.Plan);
        Assert.Equal(BillingStatus.Free, updated.BillingStatus);
        Assert.Null(updated.PaddleSubscriptionId);
    }

    [Fact]
    public async Task ProcessAsync_repeat_trial_is_stripped_when_already_consumed()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Basic, BillingStatus.Free);
        tenant.HasConsumedTrial = true;
        await db.SaveChangesAsync();
        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_2",
                Status = "active",
                CustomerId = "ctm_1",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
            },
        };
        var processor = CreateProcessor(db, client);
        var payload = $$"""
            {
              "event_id": "evt_repeat",
              "event_type": "subscription.created",
              "data": {
                "id": "sub_2",
                "status": "trialing",
                "customer_id": "ctm_1",
                "items": [{ "quantity": 1, "price": { "id": "pri_core_m" } }],
                "trial_dates": { "ends_at": "2030-02-01T00:00:00Z" },
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        Assert.True(client.EndTrialCalled);
    }

    [Fact]
    public async Task ProcessAsync_get_subscription_failure_is_retryable_and_does_not_record_event()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        var client = new FakePaddleApiClient { GetSubscriptionShouldFail = true };
        var processor = CreateProcessor(db, client);
        var payload = $$"""
            {
              "event_id": "evt_retry",
              "event_type": "transaction.completed",
              "data": {
                "id": "txn_retry",
                "status": "completed",
                "customer_id": "ctm_1",
                "subscription_id": "sub_retry",
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.False(result.Processed);
        Assert.Equal(PaddleWebhookDisposition.Retryable, result.Disposition);
        db.ChangeTracker.Clear();
        Assert.Empty(db.PaddleWebhookEvents);
        var unchanged = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Null(unchanged.PaddleSubscriptionId);
    }

    [Fact]
    public async Task ProcessAsync_retry_after_transient_failure_processes_once()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        var client = new FakePaddleApiClient { GetSubscriptionShouldFail = true };
        var processor = CreateProcessor(db, client);
        var payload = $$"""
            {
              "event_id": "evt_retry_then_ok",
              "event_type": "transaction.completed",
              "data": {
                "id": "txn_retry_then_ok",
                "status": "completed",
                "customer_id": "ctm_1",
                "subscription_id": "sub_ok",
                "custom_data": { "tenant_id": "{{tenant.Id}}" }
              }
            }
            """;

        var failed = await processor.ProcessAsync(payload);
        Assert.Equal(PaddleWebhookDisposition.Retryable, failed.Disposition);
        db.ChangeTracker.Clear();
        Assert.Empty(db.PaddleWebhookEvents);

        client.GetSubscriptionShouldFail = false;
        client.Subscription = new PaddleSubscription
        {
            Id = "sub_ok",
            Status = "active",
            CustomerId = "ctm_1",
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
        };

        var recovered = await processor.ProcessAsync(payload);
        Assert.True(recovered.Processed);
        Assert.Equal(PaddleWebhookDisposition.Processed, recovered.Disposition);
        Assert.Single(db.PaddleWebhookEvents);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal("sub_ok", updated.PaddleSubscriptionId);
        Assert.Equal(BillingStatus.Active, updated.BillingStatus);
    }

    [Fact]
    public async Task ProcessAsync_unknown_event_type_is_ignored_without_ledger()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var processor = CreateProcessor(db, new FakePaddleApiClient());

        var result = await processor.ProcessAsync("""
            {"event_id":"evt_skip","event_type":"address.updated","data":{}}
            """);

        Assert.False(result.Processed);
        Assert.Equal(PaddleWebhookDisposition.Ignored, result.Disposition);
        Assert.Empty(db.PaddleWebhookEvents);
    }

    [Fact]
    public async Task ProcessAsync_approved_chargeback_starts_pastdue()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_cb";
        tenant.PaddleSubscriptionId = "sub_cb";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_cb",
              "event_type": "adjustment.updated",
              "data": {
                "id": "adj_cb",
                "action": "chargeback",
                "status": "approved",
                "customer_id": "ctm_cb",
                "subscription_id": "sub_cb"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(BillingStatus.PastDue, updated.BillingStatus);
        Assert.NotNull(updated.DelinquencyStartedAt);
        Assert.Equal("sub_cb", updated.PaddleSubscriptionId);
    }

    [Fact]
    public async Task ProcessAsync_approved_refund_does_not_revoke_entitlements()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_rf";
        tenant.PaddleSubscriptionId = "sub_rf";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_rf",
              "event_type": "adjustment.created",
              "data": {
                "id": "adj_rf",
                "action": "refund",
                "status": "approved",
                "customer_id": "ctm_rf",
                "subscription_id": "sub_rf"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(BillingStatus.Active, updated.BillingStatus);
        Assert.Equal("sub_rf", updated.PaddleSubscriptionId);
        Assert.Null(updated.DelinquencyStartedAt);
    }

    [Fact]
    public async Task ProcessAsync_pending_refund_is_recorded_without_plan_change()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_pending";
        tenant.PaddleSubscriptionId = "sub_pending";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_pending_rf",
              "event_type": "adjustment.created",
              "data": {
                "id": "adj_pending",
                "action": "refund",
                "status": "pending_approval",
                "customer_id": "ctm_pending",
                "subscription_id": "sub_pending"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(BillingStatus.Active, updated.BillingStatus);
        Assert.Equal(TenantPlan.Core, updated.Plan);
    }

    [Fact]
    public async Task ProcessAsync_complimentary_chargeback_is_ignored()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Free, complimentary: true);
        tenant.PaddleCustomerId = "ctm_comp";
        await db.SaveChangesAsync();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_comp",
              "event_type": "adjustment.updated",
              "data": {
                "id": "adj_comp",
                "action": "chargeback",
                "status": "approved",
                "customer_id": "ctm_comp"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.True(result.Processed);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(BillingStatus.Free, updated.BillingStatus);
        Assert.True(updated.IsComplimentary);
        Assert.Null(updated.DelinquencyStartedAt);
    }

    [Fact]
    public async Task ProcessAsync_unresolvable_adjustment_is_retryable_without_ledger()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var processor = CreateProcessor(db, new FakePaddleApiClient());
        var payload = """
            {
              "event_id": "evt_orphan_adj",
              "event_type": "adjustment.created",
              "data": {
                "id": "adj_orphan",
                "action": "refund",
                "status": "approved",
                "customer_id": "ctm_missing"
              }
            }
            """;

        var result = await processor.ProcessAsync(payload);

        Assert.False(result.Processed);
        Assert.Equal(PaddleWebhookDisposition.Retryable, result.Disposition);
        Assert.Empty(db.PaddleWebhookEvents);
    }

    private static PaddleWebhookProcessor CreateProcessor(Cohestra.Infrastructure.Persistence.CohestraDbContext db, FakePaddleApiClient client) =>
        new(
            db,
            new PaddleBillingTestHarness.NoopPublishedSiteCache(),
            Options.Create(new SiteLandingSeedSettings()),
            Options.Create(PaddleBillingTestHarness.DefaultSettings()),
            client,
            NullLogger<PaddleWebhookProcessor>.Instance);
}
