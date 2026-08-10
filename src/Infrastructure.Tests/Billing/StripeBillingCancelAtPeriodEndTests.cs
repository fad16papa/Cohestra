using System.Net;
using System.Text;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Stripe;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class StripeBillingCancelAtPeriodEndTests
{
    [Fact]
    public async Task CancelSubscriptionAtPeriodEndAsync_releasesScheduleThenSetsCancelFlag()
    {
        var handler = new CancelScheduleStripeHttpHandler();
        var previousClient = StripeConfiguration.StripeClient;
        var previousApiKey = StripeConfiguration.ApiKey;

        try
        {
            StripeConfiguration.ApiKey = "sk_test_b3";
            StripeConfiguration.StripeClient = new StripeClient(new StripeClientOptions
            {
                ApiKey = "sk_test_b3",
                HttpClient = new SystemNetHttpClient(new HttpClient(handler)),
            });

            await using var db = CreateDbContext();
            var tenantId = Guid.NewGuid();
            var tenant = new Tenant
            {
                Id = tenantId,
                Slug = $"b3-{Guid.NewGuid():N}"[..16],
                Name = "Cancel Schedule Test",
                Plan = TenantPlan.Pro,
                BillingInterval = BillingInterval.Monthly,
                BillingStatus = BillingStatus.Active,
                AdminContactEmail = "owner@cohestra.local",
                StripeCustomerId = "cus_b3_test",
                StripeSubscriptionId = CancelScheduleStripeHttpHandler.SubscriptionId,
                ScheduledPlan = TenantPlan.Core,
                ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14),
                ScheduledBillingInterval = BillingInterval.Monthly,
                StripeSubscriptionScheduleId = CancelScheduleStripeHttpHandler.ScheduleId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();

            var service = CreateBillingService(db);
            await service.CancelSubscriptionAtPeriodEndAsync(
                tenantId,
                "owner@cohestra.local");

            var updated = await db.Tenants.AsNoTracking().FirstAsync(t => t.Id == tenantId);
            Assert.Null(updated.StripeSubscriptionScheduleId);
            Assert.Null(updated.ScheduledBillingInterval);
            Assert.Equal(TenantPlan.Basic, updated.ScheduledPlan);
            Assert.NotNull(updated.ScheduledPlanEffectiveAt);

            Assert.Contains(
                ("POST", $"/v1/subscription_schedules/{CancelScheduleStripeHttpHandler.ScheduleId}/release"),
                handler.Requests);
            Assert.Contains(("POST", $"/v1/subscriptions/{CancelScheduleStripeHttpHandler.SubscriptionId}"), handler.Requests);
            Assert.True(handler.ReleaseCalledBeforeCancelUpdate);
        }
        finally
        {
            StripeConfiguration.StripeClient = previousClient;
            StripeConfiguration.ApiKey = previousApiKey;
        }
    }

    private static StripeBillingService CreateBillingService(CohestraDbContext db) =>
        new(
            db,
            new StubPublishedSiteCache(),
            Options.Create(new SiteLandingSeedSettings()),
            Options.Create(new StripeSettings
            {
                SecretKey = "sk_test_b3",
                PublishableKey = "pk_test_b3",
                PriceCoreMonthly = "price_core_monthly",
                PriceCoreAnnual = "price_core_annual",
                PriceProMonthly = "price_pro_monthly",
                PriceProAnnual = "price_pro_annual",
            }),
            new StubTenantAccessService(),
            new StubOutboxPublisher(),
            Options.Create(new PublicWebOptions { BaseUrl = "https://app.cohestra.test" }),
            NullLogger<StripeBillingService>.Instance);

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase($"billing-cancel-schedule-{Guid.NewGuid():N}")
            .Options;
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(Guid.NewGuid(), "test");
        return new CohestraDbContext(options, currentTenant);
    }

    private sealed class CancelScheduleStripeHttpHandler : HttpMessageHandler
    {
        internal const string SubscriptionId = "sub_b3_test";
        internal const string ScheduleId = "sub_sched_b3_test";

        private readonly long _periodEnd = DateTimeOffset.UtcNow.AddDays(30).ToUnixTimeSeconds();
        private bool _scheduleReleased;
        private bool _cancelAtPeriodEnd;

        public List<(string Method, string Path)> Requests { get; } = [];

        public bool ReleaseCalledBeforeCancelUpdate { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var path = request.RequestUri!.AbsolutePath;
            Requests.Add((request.Method.Method.ToUpperInvariant(), path));

            if (request.Method == HttpMethod.Get
                && path.Equals($"/v1/subscriptions/{SubscriptionId}", StringComparison.Ordinal))
            {
                return Task.FromResult(JsonResponse(BuildSubscriptionJson()));
            }

            if (request.Method == HttpMethod.Post
                && path.Equals($"/v1/subscription_schedules/{ScheduleId}/release", StringComparison.Ordinal))
            {
                _scheduleReleased = true;
                return Task.FromResult(JsonResponse($$"""
                    {
                      "id": "{{ScheduleId}}",
                      "object": "subscription_schedule",
                      "status": "released"
                    }
                    """));
            }

            if (request.Method == HttpMethod.Post
                && path.Equals($"/v1/subscriptions/{SubscriptionId}", StringComparison.Ordinal))
            {
                ReleaseCalledBeforeCancelUpdate = _scheduleReleased;
                _cancelAtPeriodEnd = true;
                return Task.FromResult(JsonResponse(BuildSubscriptionJson()));
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent(
                    "{\"error\":{\"code\":\"resource_missing\",\"message\":\"Unexpected route\"}}",
                    Encoding.UTF8,
                    "application/json"),
            });
        }

        private string BuildSubscriptionJson() =>
            $$"""
            {
              "id": "{{SubscriptionId}}",
              "object": "subscription",
              "customer": "cus_b3_test",
              "status": "active",
              "cancel_at_period_end": {{(_cancelAtPeriodEnd ? "true" : "false")}},
              "current_period_end": {{_periodEnd}},
              "schedule": {{(_scheduleReleased ? "null" : $"\"{ScheduleId}\"")}},
              "items": {
                "object": "list",
                "data": [
                  {
                    "id": "si_b3_test",
                    "object": "subscription_item",
                    "current_period_end": {{_periodEnd}},
                    "price": {
                      "id": "price_pro_monthly",
                      "object": "price"
                    }
                  }
                ]
              }
            }
            """;

        private static HttpResponseMessage JsonResponse(string json) =>
            new(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
    }

    private sealed class StubPublishedSiteCache : IPublishedSiteCache
    {
        public Task<PublishedSiteCacheEntry?> GetAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.FromResult<PublishedSiteCacheEntry?>(null);

        public Task SetAsync(Guid tenantId, PublishedSiteCacheEntry entry, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class StubTenantAccessService : ITenantAccessService
    {
        public Task<TenantAccessEvaluation> EvaluateAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(TenantAccessEvaluator.Evaluate(TenantStatus.Active, BillingStatus.Active));

        public Task<TenantUsageSnapshot> GetUsageAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new TenantUsageSnapshot(1, 0, 0, 0));

        public Task TouchActivityAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class StubOutboxPublisher : IOutboxPublisher
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
