using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;

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
    public async Task GetSummary_reports_unconfigured_paddle_without_calling_provider()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var service = PaddleBillingTestHarness.CreateService(db, settings: new PaddleSettings());

        var summary = await service.GetSummaryAsync(tenant.Id);

        Assert.False(summary.BillingConfigured);
        Assert.Null(summary.ClientToken);
        Assert.Equal(TenantPlan.Basic, summary.Plan);
    }

    [Fact]
    public async Task Sync_unconfigured_returns_local_summary_without_calling_provider()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client, settings: new PaddleSettings());

        var summary = await service.SyncFromProviderAsync(tenant.Id, "txn_anything");

        Assert.False(summary.BillingConfigured);
        Assert.Equal(0, client.GetTransactionCalls);
        Assert.Equal(TenantPlan.Basic, summary.Plan);
    }

    [Fact]
    public async Task GetSummary_is_scoped_to_the_requested_tenant()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenantA = PaddleBillingTestHarness.SeedTenant(db);
        var tenantB = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "other-studio",
            Name = "Other Studio",
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Active,
            AdminContactEmail = "other@example.com",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenantB);
        await db.SaveChangesAsync();
        var service = PaddleBillingTestHarness.CreateService(db, settings: new PaddleSettings());

        var summaryA = await service.GetSummaryAsync(tenantA.Id);
        var summaryB = await service.GetSummaryAsync(tenantB.Id);

        Assert.Equal(TenantPlan.Basic, summaryA.Plan);
        Assert.Equal(TenantPlan.Pro, summaryB.Plan);
        Assert.False(summaryA.BillingConfigured);
        Assert.False(summaryB.BillingConfigured);
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

    [Fact]
    public async Task GetVerifiedCustomDomain_returns_host_only_when_verified()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.CustomDomain = "Events.Acme.Example";
        tenant.CustomDomainVerifiedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db);

        var host = await service.GetVerifiedCustomDomainAsync(tenant.Id);

        Assert.Equal("events.acme.example", host);
    }

    [Fact]
    public async Task GetVerifiedCustomDomain_returns_null_when_unverified()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.CustomDomain = "events.acme.example";
        tenant.CustomDomainVerifiedAt = null;
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db);

        Assert.Null(await service.GetVerifiedCustomDomainAsync(tenant.Id));
    }

    [Fact]
    public async Task Checkout_trialing_pro_monthly_to_annual_uses_do_not_bill()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "trialing");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.Equal("pri_pro_a", client.LastUpdatePriceId);
        Assert.Equal("immediately", client.LastUpdateEffectiveFrom);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        Assert.Contains("will not be charged", session.TrialDisclaimer, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(BillingInterval.Annual, db.Tenants.Single(t => t.Id == tenant.Id).BillingInterval);
    }

    [Fact]
    public async Task Checkout_active_pro_monthly_to_annual_uses_prorated_immediately()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.Equal("pri_pro_a", client.LastUpdatePriceId);
        Assert.Equal("prorated_immediately", client.LastUpdateProrationBillingMode);
        Assert.Contains("Yearly billing starts now", session.TrialDisclaimer, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Checkout_active_core_monthly_to_pro_monthly_keeps_next_period_proration()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Core, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(Checkout(tenant.Id) with { Plan = TenantPlan.Pro });

        Assert.Equal("pri_pro_m", client.LastUpdatePriceId);
        Assert.Equal("prorated_next_billing_period", client.LastUpdateProrationBillingMode);
        Assert.Equal(TenantPlan.Pro, db.Tenants.Single(t => t.Id == tenant.Id).Plan);
    }

    [Fact]
    public async Task Checkout_past_due_subscription_is_rejected_without_update()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "past_due");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("past due", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
        Assert.False(client.ClearScheduledCalled);
    }

    [Fact]
    public async Task Checkout_same_plan_and_interval_is_noop()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(Checkout(tenant.Id) with { Plan = TenantPlan.Pro }));

        Assert.Contains("already on the selected plan", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
    }

    [Fact]
    public async Task Checkout_upgrade_maps_provider_400_without_leaking_detail()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.UpdateSubscriptionException = new PaddleApiException(
            "secret paddle validation text",
            400,
            "subscription_update_unsuccessful");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("Could not update your subscription", ex.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("secret paddle", ex.Message, StringComparison.Ordinal);
        Assert.Equal(BillingInterval.Monthly, db.Tenants.Single(t => t.Id == tenant.Id).BillingInterval);
    }

    [Fact]
    public async Task Checkout_trialing_core_monthly_to_annual_uses_do_not_bill()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Core, BillingInterval.Monthly, "trialing");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(
            Checkout(tenant.Id) with { Plan = TenantPlan.Core, Interval = BillingInterval.Annual });

        Assert.Equal("pri_core_a", client.LastUpdatePriceId);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        Assert.Contains("will not be charged", session.TrialDisclaimer, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(BillingStatus.Trialing, db.Tenants.Single(t => t.Id == tenant.Id).BillingStatus);
        Assert.Equal(BillingInterval.Annual, db.Tenants.Single(t => t.Id == tenant.Id).BillingInterval);
    }

    [Fact]
    public async Task Checkout_active_core_monthly_to_annual_uses_prorated_immediately()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Core, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CreateCheckoutSessionAsync(
            Checkout(tenant.Id) with { Plan = TenantPlan.Core, Interval = BillingInterval.Annual });

        Assert.Equal("pri_core_a", client.LastUpdatePriceId);
        Assert.Equal("prorated_immediately", client.LastUpdateProrationBillingMode);
    }

    [Fact]
    public async Task Checkout_uses_live_paddle_interval_to_defer_annual_to_monthly()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.Subscription!.Items =
            [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_a" } }];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(
            Checkout(tenant.Id) with { Plan = TenantPlan.Pro, Interval = BillingInterval.Monthly });

        Assert.True(session.CompletedInApp);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        Assert.NotEqual("prorated_immediately", client.LastUpdateProrationBillingMode);
    }

    [Fact]
    public async Task Checkout_annual_to_monthly_is_deferred()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(
            Checkout(tenant.Id) with { Plan = TenantPlan.Pro, Interval = BillingInterval.Monthly });

        Assert.True(session.CompletedInApp);
        Assert.Equal("pri_pro_m", client.LastUpdatePriceId);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(BillingInterval.Annual, updated.BillingInterval);
        Assert.Equal(BillingInterval.Monthly, updated.ScheduledBillingInterval);
    }

    [Fact]
    public async Task Checkout_deferred_past_due_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "past_due");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("past due", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_paused_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.Status = "paused";
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("current state", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_canceled_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.Status = "canceled";
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("current state", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_multi_item_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.Items =
        [
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_a" } },
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_addon" } },
        ];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("extra items", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_quantity_over_one_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.Items =
            [new PaddleSubscriptionItem { Quantity = 3, Price = new PaddlePrice { Id = "pri_pro_a" } }];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("extra items", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_paddle_scheduled_update_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange { Action = "update" };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("already scheduled", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_tenant_scheduled_change_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        tenant.ScheduledPlan = TenantPlan.Core;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14);
        tenant.ScheduledBillingInterval = BillingInterval.Monthly;
        tenant.PaddleSubscriptionScheduleId = "sch:sub_existing:pri_core_m";
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("already scheduled", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
        Assert.Equal(TenantPlan.Core, db.Tenants.Single(t => t.Id == tenant.Id).ScheduledPlan);
    }

    [Fact]
    public async Task Checkout_deferred_cancel_with_extra_items_is_rejected_without_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange { Action = "cancel" };
        client.Subscription.Items =
        [
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_a" } },
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_addon" } },
        ];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("extra items", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_clears_pending_cancel_then_schedules_downgrade()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange
        {
            Action = "cancel",
            EffectiveAt = DateTimeOffset.UtcNow.AddDays(20),
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.True(client.ClearScheduledCalled);
        Assert.Equal("pri_pro_m", client.LastUpdatePriceId);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(BillingInterval.Annual, updated.BillingInterval);
        Assert.Equal(BillingInterval.Monthly, updated.ScheduledBillingInterval);
    }

    [Fact]
    public async Task GetSummary_reports_local_cancel_at_period_end_without_exposing_basic_schedule()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.BillingInterval = BillingInterval.Annual;
        tenant.ScheduledPlan = TenantPlan.Basic;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(12);
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db);

        var summary = await service.GetSummaryAsync(tenant.Id);

        Assert.True(summary.CancelAtPeriodEnd);
        Assert.Null(summary.ScheduledPlan);
        Assert.NotNull(summary.ScheduledPlanEffectiveAt);
    }

    [Fact]
    public async Task Checkout_deferred_missing_period_end_fails_before_mutation()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        client.Subscription!.CurrentBillingPeriod = null;
        client.Subscription.NextBilledAt = null;
        client.Subscription.ScheduledChange = null;
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("billing period ends", ex.Message, StringComparison.OrdinalIgnoreCase);
        AssertNoSubscriptionMutation(client, tenant, db, BillingInterval.Annual);
    }

    [Fact]
    public async Task Checkout_deferred_uses_cancel_effective_at_before_clearing()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        var periodEnd = DateTimeOffset.UtcNow.AddDays(18);
        client.Subscription!.CurrentBillingPeriod = null;
        client.Subscription.NextBilledAt = null;
        client.Subscription.ScheduledChange = new PaddleScheduledChange
        {
            Action = "cancel",
            EffectiveAt = periodEnd,
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.True(client.ClearScheduledCalled);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Contains(periodEnd.ToString("MMMM d, yyyy"), session.TrialDisclaimer, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Checkout_deferred_partial_cancel_clear_reconciles_and_retry_finishes()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        tenant.ScheduledPlan = TenantPlan.Basic;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(20);
        db.SaveChanges();
        client.Subscription!.ScheduledChange = new PaddleScheduledChange
        {
            Action = "cancel",
            EffectiveAt = DateTimeOffset.UtcNow.AddDays(20),
        };
        client.UpdateSubscriptionException = new PaddleApiException("secret paddle schedule fail", 409, "conflict");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id)));

        Assert.Contains("cancellation was removed", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("secret paddle", ex.Message, StringComparison.Ordinal);
        Assert.True(client.ClearScheduledCalled);
        var afterPartial = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, afterPartial.Plan);
        Assert.Equal(BillingInterval.Annual, afterPartial.BillingInterval);
        Assert.Null(afterPartial.ScheduledBillingInterval);
        Assert.NotEqual(TenantPlan.Basic, afterPartial.ScheduledPlan);

        client.UpdateSubscriptionException = null;
        client.Subscription.ScheduledChange = null;
        var session = await service.CreateCheckoutSessionAsync(MonthlyPro(tenant.Id));

        Assert.True(session.CompletedInApp);
        Assert.Equal("pri_pro_m", client.LastUpdatePriceId);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Equal(BillingInterval.Monthly, db.Tenants.Single(t => t.Id == tenant.Id).ScheduledBillingInterval);
    }

    [Fact]
    public async Task Checkout_rejects_tenant_scheduled_change_before_paddle()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        tenant.ScheduledPlan = TenantPlan.Core;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14);
        tenant.ScheduledBillingInterval = BillingInterval.Monthly;
        tenant.PaddleSubscriptionScheduleId = "sch:sub_existing:pri_core_m";
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("already scheduled", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
        Assert.False(client.ClearScheduledCalled);
    }

    [Fact]
    public async Task Checkout_rejects_paddle_scheduled_change_without_update()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange { Action = "update" };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("already scheduled", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
    }

    [Fact]
    public async Task Checkout_rejects_scheduled_cancel_without_update()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange { Action = "cancel" };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("scheduled to cancel", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
        Assert.False(client.ClearScheduledCalled);
    }

    [Fact]
    public async Task Checkout_rejects_unmapped_interval_without_update()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        tenant.BillingInterval = null;
        db.SaveChanges();
        client.Subscription!.Items =
            [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_unknown" } }];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("current billing interval", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
    }

    [Fact]
    public async Task Checkout_rejects_multi_item_subscription_without_update()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.Subscription!.Items =
        [
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_m" } },
            new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_addon" } },
        ];
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains("extra items", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(client.LastUpdatePriceId);
        Assert.False(client.ClearScheduledCalled);
    }

    [Theory]
    [InlineData(429, null, "Billing is busy")]
    [InlineData(409, null, "cannot be changed right now")]
    [InlineData(503, null, "temporarily unavailable")]
    public async Task Checkout_upgrade_maps_retryable_provider_failures(
        int status,
        string? code,
        string expected)
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = SeedSubscribedTenant(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.UpdateSubscriptionException = new PaddleApiException("secret paddle retry text", status, code);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(AnnualPro(tenant.Id)));

        Assert.Contains(expected, ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("secret paddle", ex.Message, StringComparison.Ordinal);
        Assert.Equal(BillingInterval.Monthly, db.Tenants.Single(t => t.Id == tenant.Id).BillingInterval);
    }

    private static (Tenant Tenant, FakePaddleApiClient Client) SeedSubscribedTenant(
        CohestraDbContext db,
        TenantPlan plan,
        BillingInterval interval,
        string paddleStatus)
    {
        var tenant = PaddleBillingTestHarness.SeedTenant(db, plan);
        tenant.BillingStatus = paddleStatus == "trialing" ? BillingStatus.Trialing : BillingStatus.Active;
        if (paddleStatus == "past_due")
        {
            tenant.BillingStatus = BillingStatus.PastDue;
        }

        tenant.BillingInterval = interval;
        tenant.PaddleCustomerId = "ctm_test";
        tenant.PaddleSubscriptionId = "sub_existing";
        tenant.HasConsumedTrial = paddleStatus != "trialing";
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
                TrialDates = paddleStatus == "trialing"
                    ? new PaddleTimePeriod { EndsAt = DateTimeOffset.UtcNow.AddDays(20) }
                    : null,
                CurrentBillingPeriod = new PaddleTimePeriod
                {
                    StartsAt = DateTimeOffset.UtcNow.AddDays(-10),
                    EndsAt = DateTimeOffset.UtcNow.AddDays(20),
                },
            },
        };
        return (tenant, client);
    }

    private static void AssertNoSubscriptionMutation(
        FakePaddleApiClient client,
        Tenant tenant,
        CohestraDbContext db,
        BillingInterval expectedInterval)
    {
        Assert.Null(client.LastUpdatePriceId);
        Assert.False(client.ClearScheduledCalled);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(expectedInterval, updated.BillingInterval);
        Assert.Equal(tenant.Plan, updated.Plan);
    }

    private static CreateCheckoutSessionCommand MonthlyPro(Guid tenantId) =>
        Checkout(tenantId) with { Plan = TenantPlan.Pro, Interval = BillingInterval.Monthly };

    private static CreateCheckoutSessionCommand AnnualPro(Guid tenantId) =>
        Checkout(tenantId) with { Plan = TenantPlan.Pro, Interval = BillingInterval.Annual };

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
