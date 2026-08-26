using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleBillingServiceTests
{
    [Fact]
    public async Task GetSummary_reports_paddle_configuration_and_client_token()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var service = PaddleBillingTestHarness.CreateService(db);

        var summary = await service.GetSummaryAsync(tenant.Id);

        Assert.True(summary.BillingConfigured);
        Assert.Equal("test_token", summary.ClientToken);
        Assert.Equal(30, summary.TrialPeriodDays);
        Assert.Equal(TenantPlan.Basic, summary.Plan);
    }

    [Fact]
    public async Task Checkout_complimentary_tenant_is_rejected()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, complimentary: true);
        var service = PaddleBillingTestHarness.CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(Checkout(tenant.Id)));

        Assert.Contains("Complimentary", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Checkout_basic_tenant_returns_hosted_url_and_trial_disclaimer()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var service = PaddleBillingTestHarness.CreateService(db);

        var session = await service.CreateCheckoutSessionAsync(Checkout(tenant.Id));

        Assert.Contains("paddle.com", session.CheckoutUrl, StringComparison.OrdinalIgnoreCase);
        Assert.True(session.TrialIncluded);
        Assert.False(session.CompletedInApp);
        Assert.Contains("will not be charged", session.TrialDisclaimer, StringComparison.OrdinalIgnoreCase);
        Assert.NotNull(db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
    }

    [Fact]
    public async Task Checkout_reuses_existing_paddle_customer_for_the_same_email()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = new FakePaddleApiClient
        {
            CreateCustomerShouldFail = true,
            CustomersByEmail =
            {
                new PaddleCustomer { Id = "ctm_existing", Email = "admin@example.com", Name = "CreativoRare" },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(Checkout(tenant.Id));

        Assert.Contains("paddle.com", session.CheckoutUrl, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("ctm_existing", db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
    }

    [Fact]
    public async Task Checkout_one_trial_rule_charges_immediately_on_second_upgrade()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.HasConsumedTrial = true;
        await db.SaveChangesAsync();
        var service = PaddleBillingTestHarness.CreateService(db);

        var session = await service.CreateCheckoutSessionAsync(Checkout(tenant.Id));

        Assert.False(session.TrialIncluded);
        Assert.Contains("charged immediately", session.TrialDisclaimer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Checkout_saved_card_subscribes_in_app()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_test";
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient
        {
            PaymentMethods =
            {
                new PaddlePaymentMethod
                {
                    Id = "paymtd_1",
                    Type = "card",
                    Card = new PaddleCard { Type = "visa", Last4 = "4242", ExpiryMonth = 12, ExpiryYear = 2030 },
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(Checkout(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.Equal(TenantPlan.Core, db.Tenants.Single(t => t.Id == tenant.Id).Plan);
        Assert.Equal("sub_new", db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
    }

    [Fact]
    public async Task Portal_complimentary_tenant_is_rejected()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, complimentary: true);
        var service = PaddleBillingTestHarness.CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreatePortalSessionAsync(new CreatePortalSessionCommand(
                tenant.Id,
                "https://studio.localhost/settings/billing")));

        Assert.Contains("Complimentary", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Portal_returns_paddle_customer_portal_url()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        var service = PaddleBillingTestHarness.CreateService(db);

        var session = await service.CreatePortalSessionAsync(new CreatePortalSessionCommand(
            tenant.Id,
            "https://studio.localhost/settings/billing"));

        Assert.Contains("portal", session.PortalUrl, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Details_include_card_and_invoices_from_paddle()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_live";
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_live",
                Status = "active",
                CustomerId = "ctm_test",
                CurrentBillingPeriod = new PaddleTimePeriod
                {
                    StartsAt = DateTimeOffset.UtcNow,
                    EndsAt = DateTimeOffset.UtcNow.AddDays(20),
                },
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
            },
            PaymentMethods =
            {
                new PaddlePaymentMethod
                {
                    Id = "paymtd_1",
                    Type = "card",
                    Card = new PaddleCard { Type = "visa", Last4 = "4242", ExpiryMonth = 4, ExpiryYear = 2028 },
                },
            },
            Transactions =
            {
                new PaddleTransaction
                {
                    Id = "txn_inv",
                    Status = "completed",
                    CustomerId = "ctm_test",
                    CreatedAt = DateTimeOffset.UtcNow,
                    Details = new PaddleTransactionDetails
                    {
                        Totals = new PaddleTotals { Total = "4900", CurrencyCode = "USD" },
                    },
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var details = await service.GetDetailsAsync(tenant.Id, "admin@example.com");

        Assert.NotNull(details.PaymentMethod);
        Assert.Equal("4242", details.PaymentMethod!.Last4);
        Assert.Single(details.Invoices);
        Assert.Equal(4900, details.Invoices[0].AmountDueCents);
    }

    [Fact]
    public async Task Cancel_at_period_end_schedules_basic()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_live";
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_live",
                Status = "active",
                CustomerId = "ctm_test",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
                CurrentBillingPeriod = new PaddleTimePeriod
                {
                    StartsAt = DateTimeOffset.UtcNow,
                    EndsAt = DateTimeOffset.UtcNow.AddDays(10),
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CancelSubscriptionAtPeriodEndAsync(tenant.Id, "admin@example.com");

        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.True(client.CancelCalled);
        Assert.Equal(TenantPlan.Basic, updated.ScheduledPlan);
        Assert.Equal(TenantPlan.Core, updated.Plan);
    }

    [Fact]
    public async Task Resume_clears_period_end_cancel()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Core, BillingStatus.Active);
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_live";
        tenant.ScheduledPlan = TenantPlan.Basic;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(10);
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_live",
                Status = "active",
                CustomerId = "ctm_test",
                ScheduledChange = new PaddleScheduledChange
                {
                    Action = "cancel",
                    EffectiveAt = DateTimeOffset.UtcNow.AddDays(10),
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.ResumeSubscriptionAsync(tenant.Id, "admin@example.com");

        Assert.True(client.ClearScheduledCalled);
        Assert.Null(db.Tenants.Single(t => t.Id == tenant.Id).ScheduledPlan);
    }

    [Fact]
    public async Task Cancel_scheduled_paid_change_restores_current_price()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.BillingInterval = BillingInterval.Annual;
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_live";
        tenant.ScheduledPlan = TenantPlan.Core;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(20);
        tenant.ScheduledBillingInterval = BillingInterval.Monthly;
        tenant.PaddleSubscriptionScheduleId = "sch:sub_live:pri_core_m";
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_live",
                Status = "active",
                CustomerId = "ctm_test",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_a" } }],
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CancelScheduledPlanChangeAsync(tenant.Id, "admin@example.com");

        Assert.Equal("pri_pro_a", client.LastUpdatePriceId);
        Assert.Equal("immediately", client.LastUpdateEffectiveFrom);
        Assert.Null(db.Tenants.Single(t => t.Id == tenant.Id).ScheduledPlan);
    }

    [Fact]
    public async Task Sync_from_completed_transaction_unlocks_pro()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_test";
        await db.SaveChangesAsync();
        var client = new FakePaddleApiClient
        {
            Subscription = new PaddleSubscription
            {
                Id = "sub_pro",
                Status = "trialing",
                CustomerId = "ctm_test",
                Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_m" } }],
                TrialDates = new PaddleTimePeriod
                {
                    StartsAt = DateTimeOffset.UtcNow,
                    EndsAt = DateTimeOffset.UtcNow.AddDays(30),
                },
            },
        };
        client.Transactions.Add(new PaddleTransaction
        {
            Id = "txn_01paidpro",
            Status = "completed",
            CustomerId = "ctm_test",
            SubscriptionId = "sub_pro",
            CustomData = System.Text.Json.JsonSerializer.SerializeToElement(new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
                ["plan"] = "Pro",
                ["interval"] = "Monthly",
            }),
        });
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var summary = await service.SyncFromProviderAsync(tenant.Id, "txn_01paidpro");

        Assert.Equal(TenantPlan.Pro, summary.Plan);
        Assert.Equal(BillingStatus.Trialing, summary.BillingStatus);
        Assert.Equal("sub_pro", db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
    }

    [Fact]
    public async Task Sync_waits_for_subscription_id_on_completed_checkout()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_test";
        await db.SaveChangesAsync();
        var client = new FakePaddleApiClient
        {
            AttachSubscriptionAfterGetCalls = 2,
            Subscription = new PaddleSubscription
            {
                Id = "sub_late",
                Status = "active",
                CustomerId = "ctm_test",
                Items = [new PaddleSubscriptionItem { Quantity = 1, PriceId = "pri_core_m" }],
            },
        };
        client.Transactions.Add(new PaddleTransaction
        {
            Id = "txn_01late",
            Status = "completed",
            CustomerId = "ctm_test",
            CustomData = System.Text.Json.JsonSerializer.SerializeToElement(new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
            }),
        });
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var summary = await service.SyncFromProviderAsync(tenant.Id, "txn_01late");

        Assert.True(client.GetTransactionCalls >= 2);
        Assert.Equal(TenantPlan.Core, summary.Plan);
        Assert.Equal("sub_late", db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
    }

    private static CreateCheckoutSessionCommand Checkout(Guid tenantId) =>
        new(
            tenantId,
            "studio",
            TenantPlan.Core,
            BillingInterval.Monthly,
            "admin@example.com",
            "https://studio.localhost/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
            "https://studio.localhost/billing/checkout?canceled=1");
}
