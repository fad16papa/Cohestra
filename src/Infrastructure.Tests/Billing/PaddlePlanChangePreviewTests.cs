using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddlePlanChangePreviewTests
{
    [Fact]
    public async Task Preview_active_pro_monthly_to_annual_exposes_provider_money_only()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));

        Assert.True(preview.ProviderPreviewAvailable);
        Assert.False(preview.Deferred);
        Assert.Equal("Pro", preview.CurrentPlan);
        Assert.Equal("Monthly", preview.CurrentInterval);
        Assert.Equal("Pro", preview.TargetPlan);
        Assert.Equal("Annual", preview.TargetInterval);
        Assert.Equal("USD", preview.Currency);
        Assert.Equal(1500, preview.Credit?.AmountMinor);
        Assert.Equal(8400, preview.DueNow?.AmountMinor);
        Assert.Equal(9900, preview.NextRecurringAmount?.AmountMinor);
        Assert.Equal("prorated_immediately", client.LastPreviewProrationBillingMode);
        Assert.Equal("Confirm yearly billing", preview.ConfirmLabel);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Equal(0, client.CreateCheckoutTransactionCalls);
        Assert.Equal("sub_existing", tenant.PaddleSubscriptionId);
        Assert.False(string.IsNullOrWhiteSpace(preview.PreviewState));
    }

    [Fact]
    public async Task Preview_omits_money_when_paddle_fields_are_absent()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.PreviewResult = new PaddleSubscriptionPreview
        {
            Id = "sub_existing",
            Status = "active",
            NextBilledAt = DateTimeOffset.UtcNow.AddYears(1),
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));

        Assert.True(preview.ProviderPreviewAvailable);
        Assert.Null(preview.Credit);
        Assert.Null(preview.DueNow);
        Assert.Null(preview.NextRecurringAmount);
        Assert.Null(preview.Currency);
        Assert.NotNull(preview.NextBilledAt);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Preview_rejects_decimal_paddle_amounts_instead_of_guessing()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.PreviewResult = new PaddleSubscriptionPreview
        {
            Id = "sub_existing",
            Status = "active",
            ImmediateTransaction = new PaddlePreviewTransaction
            {
                Details = new PaddleTransactionDetails
                {
                    Totals = new PaddleTotals { GrandTotal = "84.00", CurrencyCode = "USD" },
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));

        Assert.Null(preview.DueNow);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Preview_failure_blocks_confirm_and_does_not_mutate()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.PreviewSubscriptionException = new PaddleApiException("secret paddle preview", 500, "upstream");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual)));

        Assert.Contains("couldn", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("secret paddle", ex.Message, StringComparison.Ordinal);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Equal(BillingInterval.Monthly, db.Tenants.Single(t => t.Id == tenant.Id).BillingInterval);
    }

    [Fact]
    public async Task Confirm_without_preview_does_not_patch()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ConfirmPlanChangeAsync(Confirm(tenant.Id, TenantPlan.Pro, BillingInterval.Annual, previewState: null)));

        Assert.Contains("billing review", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Equal(0, client.CreateCheckoutTransactionCalls);
    }

    [Fact]
    public async Task Confirm_stale_preview_returns_conflict_without_patch()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));
        client.Subscription!.Status = "past_due";
        tenant.BillingStatus = BillingStatus.PastDue;
        db.SaveChanges();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ConfirmPlanChangeAsync(
                Confirm(tenant.Id, TenantPlan.Pro, BillingInterval.Annual, preview.PreviewState)));

        Assert.Contains("past due", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Confirm_item_change_after_preview_is_conflict()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));
        client.Subscription!.Items =
            [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }];

        var ex = await Assert.ThrowsAsync<BillingStateConflictException>(() =>
            service.ConfirmPlanChangeAsync(
                Confirm(tenant.Id, TenantPlan.Pro, BillingInterval.Annual, preview.PreviewState)));

        Assert.Equal(PaddleSubscriptionChangePolicy.StalePreviewMessage, ex.Message);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Equal("sub_existing", db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
    }

    [Fact]
    public async Task Confirm_core_monthly_to_pro_annual_patches_same_subscription()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Core, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var result = await PreviewAndConfirmAsync(service, tenant.Id, TenantPlan.Pro, BillingInterval.Annual);

        Assert.Equal("pri_pro_a", client.LastPreviewPriceId);
        Assert.Equal("pri_pro_a", client.LastUpdatePriceId);
        Assert.Equal("prorated_immediately", client.LastUpdateProrationBillingMode);
        Assert.Equal("sub_existing", db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
        Assert.Equal(TenantPlan.Pro, db.Tenants.Single(t => t.Id == tenant.Id).Plan);
        Assert.Equal(0, client.CreateCheckoutTransactionCalls);
        Assert.Equal(0, client.CreateSubscriptionCalls);
        Assert.Equal("Pro is now active.", result.SuccessMessage);
        Assert.Null(result.AmountCharged);
    }

    [Fact]
    public async Task Preview_trialing_monthly_to_annual_uses_do_not_bill_and_zero_or_omitted_due()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "trialing");
        client.PreviewResult = new PaddleSubscriptionPreview
        {
            Id = "sub_existing",
            Status = "trialing",
            NextBilledAt = DateTimeOffset.UtcNow.AddDays(20),
            ImmediateTransaction = new PaddlePreviewTransaction
            {
                Details = new PaddleTransactionDetails
                {
                    Totals = new PaddleTotals { GrandTotal = "0", CurrencyCode = "USD" },
                },
            },
        };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual));

        Assert.Equal("do_not_bill", client.LastPreviewProrationBillingMode);
        Assert.Equal(0, preview.DueNow?.AmountMinor);
        Assert.Contains("will not be charged", preview.ReviewCopy, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Preview_past_due_is_rejected()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "past_due");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual)));

        Assert.Contains("past due", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Preview_scheduled_paid_downgrade_is_rejected()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        tenant.ScheduledPlan = TenantPlan.Core;
        tenant.ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14);
        tenant.ScheduledBillingInterval = BillingInterval.Monthly;
        tenant.PaddleSubscriptionScheduleId = "sch:sub_existing:pri_core_m";
        db.SaveChanges();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual)));

        Assert.Contains("already scheduled", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task Preview_pending_cancellation_immediate_change_is_rejected()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        client.Subscription!.ScheduledChange = new PaddleScheduledChange { Action = "cancel" };
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Annual)));

        Assert.Contains("scheduled to cancel", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.False(client.ClearScheduledCalled);
    }

    [Fact]
    public async Task Preview_deferred_annual_to_monthly_skips_provider_preview()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Annual, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var preview = await service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Monthly));

        Assert.True(preview.Deferred);
        Assert.False(preview.ProviderPreviewAvailable);
        Assert.Null(preview.DueNow);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Contains("monthly", preview.ReviewCopy, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Confirm_deferred_pro_to_core_preserves_period_end_schedule()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var (tenant, client) = Seed(db, TenantPlan.Pro, BillingInterval.Monthly, "active");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var result = await service.ConfirmPlanChangeAsync(
            Confirm(tenant.Id, TenantPlan.Core, BillingInterval.Monthly, previewState: null));

        Assert.True(result.CompletedInApp);
        Assert.Equal("pri_core_m", client.LastUpdatePriceId);
        Assert.Equal("next_billing_period", client.LastUpdateEffectiveFrom);
        Assert.Equal("do_not_bill", client.LastUpdateProrationBillingMode);
        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(TenantPlan.Core, updated.ScheduledPlan);
        Assert.Equal("sub_existing", updated.PaddleSubscriptionId);
        Assert.Equal(0, client.CreateCheckoutTransactionCalls);
    }

    [Fact]
    public async Task Preview_basic_tenant_is_rejected_without_creating_subscription()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PreviewPlanChangeAsync(Preview(tenant.Id, TenantPlan.Pro, BillingInterval.Monthly)));

        Assert.Contains("Checkout", ex.Message, StringComparison.Ordinal);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.Equal(0, client.CreateCheckoutTransactionCalls);
        Assert.Equal(0, client.CreateSubscriptionCalls);
    }

    [Fact]
    public async Task Checkout_basic_to_pro_still_opens_paddle_checkout()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_test";
        db.SaveChanges();
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(
            new CreateCheckoutSessionCommand(
                tenant.Id,
                "studio",
                TenantPlan.Pro,
                BillingInterval.Monthly,
                "admin@example.com",
                "https://studio.localhost/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
                "https://studio.localhost/billing/checkout?canceled=1"));

        Assert.False(session.CompletedInApp);
        Assert.Equal(1, client.CreateCheckoutTransactionCalls);
        Assert.Equal(0, client.CreateSubscriptionCalls);
        Assert.Equal(0, client.PreviewSubscriptionCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
        Assert.Contains("sandbox-pay.paddle.com", session.CheckoutUrl, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Checkout_basic_to_core_still_opens_paddle_checkout()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_test";
        db.SaveChanges();
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var session = await service.CreateCheckoutSessionAsync(
            new CreateCheckoutSessionCommand(
                tenant.Id,
                "studio",
                TenantPlan.Core,
                BillingInterval.Monthly,
                "admin@example.com",
                "https://studio.localhost/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
                "https://studio.localhost/billing/checkout?canceled=1"));

        Assert.False(session.CompletedInApp);
        Assert.Equal(1, client.CreateCheckoutTransactionCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public void Planner_preview_and_apply_share_price_and_proration()
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "studio",
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            BillingInterval = BillingInterval.Monthly,
            PaddleSubscriptionId = "sub_existing",
        };
        var subscription = new PaddleSubscription
        {
            Id = "sub_existing",
            Status = "active",
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_m" } }],
        };

        var preview = PaddleSubscriptionChangePlanner.Build(
            tenant,
            subscription,
            TenantPlan.Pro,
            BillingInterval.Annual,
            PaddleBillingTestHarness.DefaultSettings(),
            "studio");
        var apply = PaddleSubscriptionChangePlanner.Build(
            tenant,
            subscription,
            TenantPlan.Pro,
            BillingInterval.Annual,
            PaddleBillingTestHarness.DefaultSettings(),
            "studio");

        Assert.Equal(preview.TargetPriceId, apply.TargetPriceId);
        Assert.Equal(preview.EffectiveFrom, apply.EffectiveFrom);
        Assert.Equal(preview.ProrationBillingMode, apply.ProrationBillingMode);
        Assert.Equal(preview.StateFingerprint, apply.StateFingerprint);
        Assert.Equal("pri_pro_a", preview.TargetPriceId);
        Assert.Equal("prorated_immediately", preview.ProrationBillingMode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12.50")]
    [InlineData("1e3")]
    public void Minor_units_reject_non_integer_provider_strings(string? value)
    {
        Assert.Null(PaddleMinorUnits.TryParse(value));
    }

    [Fact]
    public void Minor_units_parse_signed_integers()
    {
        Assert.Equal(8400, PaddleMinorUnits.TryParse("8400"));
        Assert.Equal(0, PaddleMinorUnits.TryParse("0"));
        Assert.Equal(-1500, PaddleMinorUnits.TryParse("-1500"));
    }

    private static async Task<ConfirmPlanChangeDto> PreviewAndConfirmAsync(
        IBillingService service,
        Guid tenantId,
        TenantPlan plan,
        BillingInterval interval)
    {
        var preview = await service.PreviewPlanChangeAsync(Preview(tenantId, plan, interval));
        return await service.ConfirmPlanChangeAsync(Confirm(tenantId, plan, interval, preview.PreviewState));
    }

    private static (Tenant Tenant, FakePaddleApiClient Client) Seed(
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

    private static PreviewPlanChangeCommand Preview(Guid tenantId, TenantPlan plan, BillingInterval interval) =>
        new(tenantId, "studio", plan, interval);

    private static ConfirmPlanChangeCommand Confirm(
        Guid tenantId,
        TenantPlan plan,
        BillingInterval interval,
        string? previewState) =>
        new(
            tenantId,
            "studio",
            plan,
            interval,
            previewState,
            "https://studio.localhost/dashboard?billing=success",
            "https://studio.localhost/billing/checkout");
}
