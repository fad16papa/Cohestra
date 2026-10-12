using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleBillingRecipientTests
{
    private const string OwnerEmail = "owner@example.com";
    private const string OtherAdminEmail = "other@example.com";
    private const string CustomerId = "ctm_existing";
    private const string SubscriptionId = "sub_existing";

    [Fact]
    public async Task A_Checkout_creates_paddle_customer_as_admin_contact_email()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedOwnerTenant(db);
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CreateCheckoutSessionAsync(Checkout(tenant.Id, OwnerEmail));

        Assert.Equal(OwnerEmail, client.LastCreatedCustomerEmail);
        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal(1, client.CreateCustomerCalls);
        Assert.NotNull(db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
    }

    [Fact]
    public async Task A_Checkout_uses_admin_contact_email_when_signed_in_operator_differs()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedOwnerTenant(db);
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CreateCheckoutSessionAsync(Checkout(tenant.Id, OtherAdminEmail));

        Assert.Equal(OwnerEmail, client.LastCreatedCustomerEmail);
        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.NotEqual(OtherAdminEmail, client.LastCreatedCustomerEmail);
    }

    [Fact]
    public async Task B_GetDetails_syncs_drifted_customer_email_on_the_same_id()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var details = await service.GetDetailsAsync(tenant.Id, OwnerEmail);

        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal(OwnerEmail, client.LastUpdatedCustomerEmail);
        Assert.Equal(CustomerId, client.LastUpdatedCustomerId);
        Assert.Equal(CustomerId, db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
        Assert.Equal(0, client.CreateCustomerCalls);
        Assert.Equal(OwnerEmail, details.Contact?.Email);
    }

    [Fact]
    public async Task B_ConfirmPlanChange_syncs_drifted_customer_email_without_new_customer()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        AttachLiveSubscription(client);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await PreviewAndConfirmAsync(service, tenant.Id);

        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal(CustomerId, updated.PaddleCustomerId);
        Assert.Equal(SubscriptionId, updated.PaddleSubscriptionId);
        Assert.Equal(0, client.CreateCustomerCalls);
        Assert.Equal(1, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task C_Paid_non_owner_is_denied_and_does_not_change_paddle_email()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var denied = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetDetailsAsync(tenant.Id, OtherAdminEmail));

        Assert.Contains("Billing is managed by", denied.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("pdl_", denied.Message, StringComparison.Ordinal);
        Assert.Equal(OtherAdminEmail, client.Customer.Email);
        Assert.Equal(0, client.UpdateCustomerCalls);
        Assert.Equal(0, client.CreateCustomerCalls);
        Assert.Equal(CustomerId, db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
        Assert.Equal(SubscriptionId, db.Tenants.Single(t => t.Id == tenant.Id).PaddleSubscriptionId);
    }

    [Fact]
    public async Task D_Basic_invited_admin_cannot_retarget_paddle_customer_email()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedOwnerTenant(db);
        Assert.True(TenantBillingAccess.CanManageBilling(tenant, OtherAdminEmail, isTenantAdmin: true));
        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CreateCheckoutSessionAsync(Checkout(tenant.Id, OtherAdminEmail));

        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal(OwnerEmail, client.LastCreatedCustomerEmail);
    }

    [Fact]
    public void D_Paid_invited_admin_cannot_manage_billing()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            AdminContactEmail = OwnerEmail,
        };

        Assert.True(TenantBillingAccess.IsBillingOwner(tenant, OwnerEmail));
        Assert.False(TenantBillingAccess.CanManageBilling(tenant, OtherAdminEmail, isTenantAdmin: true));
        Assert.False(TenantBillingAccess.CanManageBilling(tenant, OwnerEmail, isTenantAdmin: false));
        Assert.True(TenantBillingAccess.CanManageBilling(tenant, OwnerEmail, isTenantAdmin: true));
    }

    [Fact]
    public async Task E_UpdateBillingContact_does_not_use_operator_or_request_email()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.UpdateBillingContactAsync(
            tenant.Id,
            OwnerEmail,
            "Studio Owner",
            OtherAdminEmail,
            null,
            null);

        Assert.Equal(OwnerEmail, client.LastUpdatedCustomerEmail);
        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal("Studio Owner", client.Customer.Name);
        Assert.Equal(OwnerEmail, db.Tenants.Single(t => t.Id == tenant.Id).AdminContactEmail);
        Assert.Equal(CustomerId, db.Tenants.Single(t => t.Id == tenant.Id).PaddleCustomerId);
        Assert.Equal(0, client.CreateCustomerCalls);
    }

    [Fact]
    public async Task F_G_Reconciliation_preserves_paddle_customer_and_subscription_ids()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.GetDetailsAsync(tenant.Id, OwnerEmail);

        var updated = db.Tenants.Single(t => t.Id == tenant.Id);
        Assert.Equal(CustomerId, updated.PaddleCustomerId);
        Assert.Equal(SubscriptionId, updated.PaddleSubscriptionId);
        Assert.Equal(CustomerId, client.LastUpdatedCustomerId);
        Assert.Equal(0, client.CreateCustomerCalls);
        Assert.Equal(0, client.CreateSubscriptionCalls);
    }

    [Fact]
    public async Task H_Tenant_isolation_does_not_reuse_or_mutate_the_other_workspace_customer()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenantA = SeedOwnerTenant(db);
        var tenantB = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "other-studio",
            Name = "Other Studio",
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Active,
            AdminContactEmail = "other-owner@example.com",
            PaddleCustomerId = "ctm_other",
            PaddleSubscriptionId = "sub_other",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenantB);
        await db.SaveChangesAsync();

        var client = new FakePaddleApiClient();
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.CreateCheckoutSessionAsync(Checkout(tenantA.Id, OtherAdminEmail));

        var updatedA = db.Tenants.Single(t => t.Id == tenantA.Id);
        var updatedB = db.Tenants.Single(t => t.Id == tenantB.Id);
        Assert.Equal(OwnerEmail, client.LastCreatedCustomerEmail);
        Assert.NotEqual("ctm_other", updatedA.PaddleCustomerId);
        Assert.Equal("ctm_other", updatedB.PaddleCustomerId);
        Assert.Equal("sub_other", updatedB.PaddleSubscriptionId);
        Assert.Equal("other-owner@example.com", updatedB.AdminContactEmail);
    }

    [Fact]
    public async Task I_Customer_sync_failure_does_not_leak_provider_secrets()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwnerTenant(db);
        var client = DriftedCustomer(tenant);
        client.UpdateCustomerException = new PaddleApiException(
            "secret paddle customer key pdl_sdbx_leak",
            500,
            "error");
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetDetailsAsync(tenant.Id, OwnerEmail));

        Assert.Equal("Could not sync billing email for this workspace.", ex.Message);
        Assert.DoesNotContain("secret paddle", ex.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("pdl_", ex.Message, StringComparison.Ordinal);
    }

    private static Tenant SeedOwnerTenant(CohestraDbContext db)
    {
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.AdminContactEmail = OwnerEmail;
        db.SaveChanges();
        return tenant;
    }

    private static Tenant SeedPaidOwnerTenant(CohestraDbContext db)
    {
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.AdminContactEmail = OwnerEmail;
        tenant.BillingInterval = BillingInterval.Monthly;
        tenant.PaddleCustomerId = CustomerId;
        tenant.PaddleSubscriptionId = SubscriptionId;
        tenant.HasConsumedTrial = true;
        db.SaveChanges();
        return tenant;
    }

    private static FakePaddleApiClient DriftedCustomer(Tenant tenant) =>
        new()
        {
            Customer = new PaddleCustomer
            {
                Id = tenant.PaddleCustomerId ?? CustomerId,
                Email = OtherAdminEmail,
                Name = tenant.Name,
            },
        };

    private static void AttachLiveSubscription(FakePaddleApiClient client)
    {
        client.Subscription = new PaddleSubscription
        {
            Id = SubscriptionId,
            Status = "active",
            CustomerId = CustomerId,
            Items =
            [
                new PaddleSubscriptionItem
                {
                    Quantity = 1,
                    Price = new PaddlePrice { Id = "pri_pro_m" },
                },
            ],
            CurrentBillingPeriod = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow.AddDays(-10),
                EndsAt = DateTimeOffset.UtcNow.AddDays(20),
            },
        };
    }

    private static async Task PreviewAndConfirmAsync(IBillingService service, Guid tenantId)
    {
        var preview = await service.PreviewPlanChangeAsync(
            new PreviewPlanChangeCommand(tenantId, "studio", TenantPlan.Pro, BillingInterval.Annual));
        await service.ConfirmPlanChangeAsync(
            new ConfirmPlanChangeCommand(
                tenantId,
                "studio",
                TenantPlan.Pro,
                BillingInterval.Annual,
                preview.PreviewState,
                "https://studio.localhost/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
                "https://studio.localhost/billing/checkout?canceled=1"));
    }

    private static CreateCheckoutSessionCommand Checkout(Guid tenantId, string operatorEmail) =>
        new(
            tenantId,
            "studio",
            TenantPlan.Core,
            BillingInterval.Monthly,
            operatorEmail,
            "https://studio.localhost/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}",
            "https://studio.localhost/billing/checkout?canceled=1");
}
