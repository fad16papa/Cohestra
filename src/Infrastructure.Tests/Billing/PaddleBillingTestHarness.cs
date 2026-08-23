using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Billing;

internal static class PaddleBillingTestHarness
{
    internal static PaddleSettings DefaultSettings() =>
        new()
        {
            ApiKey = "pdl_sdbx_test",
            ClientToken = "test_token",
            WebhookSecret = "pdl_ntfset_test",
            Environment = "sandbox",
            PriceCoreMonthly = "pri_core_m",
            PriceCoreAnnual = "pri_core_a",
            PriceProMonthly = "pri_pro_m",
            PriceProAnnual = "pri_pro_a",
            TrialPeriodDays = 30,
        };

    internal static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }

    internal static Tenant SeedTenant(
        CohestraDbContext db,
        TenantPlan plan = TenantPlan.Basic,
        BillingStatus status = BillingStatus.Free,
        bool complimentary = false)
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "studio",
            Name = "Studio",
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = status,
            AdminContactEmail = "admin@example.com",
            IsComplimentary = complimentary,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        db.SaveChanges();
        return tenant;
    }

    internal static PaddleBillingService CreateService(
        CohestraDbContext db,
        FakePaddleApiClient? client = null,
        PaddleSettings? settings = null)
    {
        return new PaddleBillingService(
            db,
            Options.Create(settings ?? DefaultSettings()),
            new StubUsage(),
            client ?? new FakePaddleApiClient(),
            new NoopPublishedSiteCache(),
            Options.Create(new SiteLandingSeedSettings()),
            new NoopOutboxPublisher(),
            Options.Create(new PublicWebOptions()),
            NullLogger<PaddleBillingService>.Instance);
    }

    internal sealed class StubUsage : ITenantAccessService
    {
        public Task<TenantAccessEvaluation> EvaluateAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(TenantAccessEvaluator.Evaluate(new Tenant { Plan = TenantPlan.Basic }));

        public Task<TenantUsageSnapshot> GetUsageAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new TenantUsageSnapshot(1, 0, 0, 0));

        public Task TouchActivityAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    internal sealed class NoopPublishedSiteCache : IPublishedSiteCache
    {
        public Task<PublishedSiteCacheEntry?> GetAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<PublishedSiteCacheEntry?>(null);

        public Task SetAsync(
            Guid tenantId,
            PublishedSiteCacheEntry entry,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    internal sealed class NoopOutboxPublisher : IOutboxPublisher
    {
        public void Enqueue(
            Guid tenantId,
            string messageType,
            string payloadJson,
            string? dedupeKey = null,
            DateTimeOffset? nextAttemptAt = null)
        {
        }
    }
}
