using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleBillingContactPhoneTests
{
    private const string OwnerEmail = "owner@example.com";
    private const string OtherAdminEmail = "other@example.com";
    private const string CustomerId = "ctm_existing";
    private const string SubscriptionId = "sub_existing";

    [Fact]
    public async Task A_B_C_Owner_saves_valid_sg_phone_and_reload_returns_it()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        var client = MatchingCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.UpdateBillingContactAsync(
            tenant.Id,
            OwnerEmail,
            tenant.Name,
            OtherAdminEmail,
            "SG",
            "91234567");

        var stored = db.Tenants.Single(row => row.Id == tenant.Id);
        Assert.Equal("+6591234567", stored.BillingContactPhone);

        var first = await service.GetDetailsAsync(tenant.Id, OwnerEmail);
        Assert.Equal("+6591234567", first.Contact?.Phone);

        var second = await service.GetDetailsAsync(tenant.Id, OwnerEmail);
        Assert.Equal("+6591234567", second.Contact?.Phone);
    }

    [Fact]
    public async Task D_E_Phone_only_update_does_not_change_owner_or_provider_ids()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        var plan = tenant.Plan;
        var interval = tenant.BillingInterval;
        var billing = tenant.BillingStatus;
        var client = MatchingCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.UpdateBillingContactAsync(
            tenant.Id,
            OwnerEmail,
            null,
            OtherAdminEmail,
            "SG",
            "91234567");

        var stored = db.Tenants.Single(row => row.Id == tenant.Id);
        Assert.Equal("+6591234567", stored.BillingContactPhone);
        Assert.Equal(OwnerEmail, stored.AdminContactEmail);
        Assert.Equal(CustomerId, stored.PaddleCustomerId);
        Assert.Equal(SubscriptionId, stored.PaddleSubscriptionId);
        Assert.Equal(plan, stored.Plan);
        Assert.Equal(interval, stored.BillingInterval);
        Assert.Equal(billing, stored.BillingStatus);
        Assert.Equal(OwnerEmail, client.LastUpdatedCustomerEmail);
        Assert.Equal(OwnerEmail, client.Customer.Email);
        Assert.Equal(CustomerId, client.LastUpdatedCustomerId);
        Assert.Equal(0, client.CreateCustomerCalls);
        Assert.Equal(0, client.UpdateSubscriptionCalls);
    }

    [Fact]
    public async Task F_Empty_local_clears_stored_phone()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        tenant.BillingContactPhone = "+6591234567";
        await db.SaveChangesAsync();
        var client = MatchingCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        await service.UpdateBillingContactAsync(
            tenant.Id,
            OwnerEmail,
            tenant.Name,
            OwnerEmail,
            "SG",
            "   ");

        var stored = db.Tenants.Single(row => row.Id == tenant.Id);
        Assert.Null(stored.BillingContactPhone);
        Assert.Null((await service.GetDetailsAsync(tenant.Id, OwnerEmail)).Contact?.Phone);
    }

    [Fact]
    public async Task G_Invalid_phone_is_rejected_and_not_stored()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        var client = MatchingCustomer(tenant);
        var service = PaddleBillingTestHarness.CreateService(db, client);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateBillingContactAsync(
                tenant.Id,
                OwnerEmail,
                tenant.Name,
                OwnerEmail,
                "SG",
                "12345678"));

        Assert.Contains("Singapore mobile", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Null(db.Tenants.Single(row => row.Id == tenant.Id).BillingContactPhone);
        Assert.Equal(0, client.UpdateCustomerCalls);
    }

    [Fact]
    public async Task H_Tenant_isolation_does_not_leak_phone()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenantA = SeedPaidOwner(db);
        var tenantB = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "other-studio",
            Name = "Other Studio",
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Active,
            BillingInterval = BillingInterval.Annual,
            AdminContactEmail = "other-owner@example.com",
            PaddleCustomerId = "ctm_other",
            PaddleSubscriptionId = "sub_other",
            BillingContactPhone = "+6598765432",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenantB);
        await db.SaveChangesAsync();

        var client = MatchingCustomer(tenantA);
        var service = PaddleBillingTestHarness.CreateService(db, client);
        await service.UpdateBillingContactAsync(
            tenantA.Id,
            OwnerEmail,
            tenantA.Name,
            OwnerEmail,
            "SG",
            "91234567");

        var detailsA = await service.GetDetailsAsync(tenantA.Id, OwnerEmail);
        Assert.Equal("+6591234567", detailsA.Contact?.Phone);
        Assert.Equal("+6598765432", db.Tenants.Single(row => row.Id == tenantB.Id).BillingContactPhone);
        Assert.NotEqual(
            db.Tenants.Single(row => row.Id == tenantA.Id).BillingContactPhone,
            db.Tenants.Single(row => row.Id == tenantB.Id).BillingContactPhone);
    }

    [Fact]
    public async Task Unconfigured_paddle_fallback_still_returns_local_phone()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        tenant.BillingContactPhone = "+6591234567";
        await db.SaveChangesAsync();
        var service = PaddleBillingTestHarness.CreateService(db, settings: new PaddleSettings());

        var details = await service.GetDetailsAsync(tenant.Id, OwnerEmail);

        Assert.Equal("+6591234567", details.Contact?.Phone);
        Assert.Equal(OwnerEmail, details.Contact?.Email);
    }

    [Fact]
    public async Task Phone_update_does_not_enqueue_billing_notification()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = SeedPaidOwner(db);
        var client = MatchingCustomer(tenant);
        var outbox = new PaddleBillingTestHarness.CapturingOutboxPublisher();
        var service = PaddleBillingTestHarness.CreateService(db, client, outboxPublisher: outbox);

        await service.UpdateBillingContactAsync(
            tenant.Id,
            OwnerEmail,
            tenant.Name,
            OwnerEmail,
            "SG",
            "91234567");

        Assert.DoesNotContain(
            outbox.Messages,
            message => message.MessageType == "billing.notification");
    }

    private static Tenant SeedPaidOwner(CohestraDbContext db)
    {
        var tenant = PaddleBillingTestHarness.SeedTenant(db, TenantPlan.Pro, BillingStatus.Active);
        tenant.AdminContactEmail = OwnerEmail;
        tenant.BillingInterval = BillingInterval.Annual;
        tenant.PaddleCustomerId = CustomerId;
        tenant.PaddleSubscriptionId = SubscriptionId;
        tenant.HasConsumedTrial = true;
        db.SaveChanges();
        return tenant;
    }

    private static FakePaddleApiClient MatchingCustomer(Tenant tenant) =>
        new()
        {
            Customer = new PaddleCustomer
            {
                Id = tenant.PaddleCustomerId ?? CustomerId,
                Email = OwnerEmail,
                Name = tenant.Name,
            },
        };
}
