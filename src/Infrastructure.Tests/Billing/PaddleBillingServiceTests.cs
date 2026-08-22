using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleBillingServiceTests
{
    [Fact]
    public async Task GetSummary_reports_paddle_configuration_and_client_token()
    {
        await using var db = CreateDb();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "studio",
            Name = "Studio",
            Plan = TenantPlan.Basic,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var service = new PaddleBillingService(
            db,
            Options.Create(new PaddleSettings
            {
                ApiKey = "pdl_sdbx_test",
                ClientToken = "test_token",
                TrialPeriodDays = 30,
            }),
            new StubUsage());

        var summary = await service.GetSummaryAsync(tenant.Id);

        Assert.True(summary.BillingConfigured);
        Assert.Equal("test_token", summary.ClientToken);
        Assert.Equal(30, summary.TrialPeriodDays);
        Assert.Equal(TenantPlan.Basic, summary.Plan);
    }

    [Fact]
    public async Task Checkout_throws_until_later_stories()
    {
        await using var db = CreateDb();
        var service = new PaddleBillingService(
            db,
            Options.Create(new PaddleSettings { ApiKey = "pdl_sdbx_test" }),
            new StubUsage());

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateCheckoutSessionAsync(new Cohestra.Application.Billing.CreateCheckoutSessionCommand(
                Guid.NewGuid(),
                "studio",
                TenantPlan.Core,
                BillingInterval.Monthly,
                "admin@example.com",
                "https://studio.localhost/ok",
                "https://studio.localhost/cancel")));

        Assert.Contains("not implemented", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }

    private sealed class StubUsage : ITenantAccessService
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
}
