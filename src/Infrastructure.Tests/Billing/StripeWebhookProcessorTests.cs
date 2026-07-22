using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class StripeWebhookProcessorTests
{
    [Fact]
    public async Task ProcessAsync_IsIdempotentOnEventId()
    {
        await using var db = CreateDbContext();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = $"idem-{Guid.NewGuid():N}"[..16],
            Name = "Idempotency Test",
            Plan = TenantPlan.Core,
            BillingStatus = BillingStatus.Active,
            StripeCustomerId = "cus_idempotent",
            StripeSubscriptionId = "sub_idempotent",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var processor = CreateProcessor(db);
        var stripeEvent = new Event
        {
            Id = $"evt_{Guid.NewGuid():N}",
            Type = EventTypes.InvoicePaymentFailed,
            Data = new EventData
            {
                Object = new Invoice
                {
                    CustomerId = tenant.StripeCustomerId,
                    Parent = new InvoiceParent
                    {
                        SubscriptionDetails = new InvoiceParentSubscriptionDetails
                        {
                            SubscriptionId = tenant.StripeSubscriptionId,
                        },
                    },
                },
            },
        };

        var first = await processor.ProcessAsync(stripeEvent);
        var second = await processor.ProcessAsync(stripeEvent);

        Assert.True(first.Processed);
        Assert.False(first.Duplicate);
        Assert.False(second.Processed);
        Assert.True(second.Duplicate);

        var ledgerCount = await db.StripeWebhookEvents.CountAsync(e => e.EventId == stripeEvent.Id);
        Assert.Equal(1, ledgerCount);
    }

    [Fact]
    public async Task ProcessAsync_HandlerFailure_DoesNotLedgerEvent()
    {
        await using var db = CreateDbContext();
        var processor = CreateProcessor(db);

        var stripeEvent = new Event
        {
            Id = $"evt_{Guid.NewGuid():N}",
            Type = EventTypes.CheckoutSessionCompleted,
            Data = new EventData
            {
                Object = new Session
                {
                    Id = "cs_test_missing_sub",
                    SubscriptionId = null,
                },
            },
        };

        var result = await processor.ProcessAsync(stripeEvent);

        Assert.False(result.Processed);
        Assert.False(result.Duplicate);
        Assert.Equal(0, await db.StripeWebhookEvents.CountAsync());
    }

    [Fact]
    public async Task ProcessAsync_InvoicePaymentFailed_UpdatesTenantPastDue()
    {
        await using var db = CreateDbContext();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = $"pastdue-{Guid.NewGuid():N}"[..20],
            Name = "Past Due Test",
            Plan = TenantPlan.Core,
            BillingStatus = BillingStatus.Active,
            StripeCustomerId = "cus_pastdue_test",
            StripeSubscriptionId = "sub_pastdue_test",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var processor = CreateProcessor(db);
        var stripeEvent = new Event
        {
            Id = $"evt_{Guid.NewGuid():N}",
            Type = EventTypes.InvoicePaymentFailed,
            Data = new EventData
            {
                Object = new Invoice
                {
                    CustomerId = tenant.StripeCustomerId,
                },
            },
        };

        var result = await processor.ProcessAsync(stripeEvent);
        Assert.True(result.Processed);

        var updated = await db.Tenants.AsNoTracking().SingleAsync(t => t.Id == tenant.Id);
        Assert.Equal(BillingStatus.PastDue, updated.BillingStatus);
        Assert.NotNull(updated.DelinquencyStartedAt);
    }

    private static StripeWebhookProcessor CreateProcessor(CohestraDbContext db) =>
        new(
            db,
            Options.Create(new StripeSettings { SecretKey = "sk_test_placeholder" }),
            NullLogger<StripeWebhookProcessor>.Instance);

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase($"billing-webhook-{Guid.NewGuid():N}")
            .Options;

        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TenantIds.Default, "default");
        return new CohestraDbContext(options, currentTenant);
    }
}
