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
    public async Task ProcessAsync_missing_event_id_is_ignored()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var processor = CreateProcessor(db, new FakePaddleApiClient());

        var result = await processor.ProcessAsync("""{"event_type":"subscription.updated","data":{}}""");

        Assert.False(result.Processed);
        Assert.Equal("Missing event id.", result.Detail);
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
        Assert.True(second.Duplicate);
        Assert.False(second.Processed);
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

    private static PaddleWebhookProcessor CreateProcessor(Cohestra.Infrastructure.Persistence.CohestraDbContext db, FakePaddleApiClient client) =>
        new(
            db,
            new PaddleBillingTestHarness.NoopPublishedSiteCache(),
            Options.Create(new SiteLandingSeedSettings()),
            Options.Create(PaddleBillingTestHarness.DefaultSettings()),
            client,
            NullLogger<PaddleWebhookProcessor>.Instance);
}
