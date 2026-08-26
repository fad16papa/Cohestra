using System.Text.Json;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleCheckoutReturnResolverTests
{
    [Fact]
    public async Task Resolve_localhost_uses_tenant_slug_host()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = TransactionClient(tenant, "txn_01checkoutreturn");
        var resolver = CreateResolver(db, client, "http://localhost:8088");

        var url = await resolver.ResolveDashboardUrlAsync("txn_01checkoutreturn");

        Assert.Equal(
            $"http://studio.localhost:8088/dashboard?billing=success&session_id=txn_01checkoutreturn",
            url?.RedirectUrl);
        Assert.Equal(tenant.Id, url?.TenantId);
    }

    [Fact]
    public async Task Resolve_production_uses_cohestra_subdomain()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.Slug = "creativorare";
        db.SaveChanges();
        var client = TransactionClient(tenant, "txn_01prodreturn");
        var resolver = CreateResolver(db, client, "https://cohestra.app");

        var url = await resolver.ResolveDashboardUrlAsync("txn_01prodreturn");

        Assert.Equal(
            "https://creativorare.cohestra.app/dashboard?billing=success&session_id=txn_01prodreturn",
            url?.RedirectUrl);
    }

    [Fact]
    public async Task Resolve_prefers_tenant_id_over_custom_data_slug()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        var client = new FakePaddleApiClient();
        client.Transactions.Add(new PaddleTransaction
        {
            Id = "txn_01idwins",
            CustomerId = "ctm_other",
            CustomData = JsonSerializer.SerializeToElement(new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
                ["tenant_slug"] = "evil-slug",
            }),
        });
        var resolver = CreateResolver(db, client, "https://cohestra.app");

        var url = await resolver.ResolveDashboardUrlAsync("txn_01idwins");

        Assert.Equal(
            "https://studio.cohestra.app/dashboard?billing=success&session_id=txn_01idwins",
            url?.RedirectUrl);
    }

    [Fact]
    public async Task Resolve_falls_back_to_paddle_customer_id()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        var tenant = PaddleBillingTestHarness.SeedTenant(db);
        tenant.PaddleCustomerId = "ctm_linked";
        db.SaveChanges();
        var client = new FakePaddleApiClient();
        client.Transactions.Add(new PaddleTransaction
        {
            Id = "txn_01customerfallback",
            CustomerId = "ctm_linked",
        });
        var resolver = CreateResolver(db, client, "http://localhost:8088");

        var url = await resolver.ResolveDashboardUrlAsync("txn_01customerfallback");

        Assert.Equal(
            "http://studio.localhost:8088/dashboard?billing=success&session_id=txn_01customerfallback",
            url?.RedirectUrl);
    }

    [Fact]
    public async Task Resolve_unknown_or_invalid_transaction_returns_null()
    {
        await using var db = PaddleBillingTestHarness.CreateDb();
        PaddleBillingTestHarness.SeedTenant(db);
        var resolver = CreateResolver(db, new FakePaddleApiClient(), "http://localhost:8088");

        Assert.Null(await resolver.ResolveDashboardUrlAsync("txn_missing"));
        Assert.Null(await resolver.ResolveDashboardUrlAsync("not-a-txn"));
        Assert.Null(await resolver.ResolveDashboardUrlAsync("txn_"));
        Assert.Null(await resolver.ResolveDashboardUrlAsync("https://evil.example/txn_abc"));
    }

    private static FakePaddleApiClient TransactionClient(Tenant tenant, string transactionId)
    {
        var client = new FakePaddleApiClient();
        client.Transactions.Add(new PaddleTransaction
        {
            Id = transactionId,
            CustomerId = "ctm_test",
            CustomData = JsonSerializer.SerializeToElement(new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
                ["tenant_slug"] = tenant.Slug,
            }),
        });
        return client;
    }

    private static PaddleCheckoutReturnResolver CreateResolver(
        Cohestra.Infrastructure.Persistence.CohestraDbContext db,
        FakePaddleApiClient client,
        string publicBaseUrl) =>
        new(
            db,
            client,
            Options.Create(new PublicWebOptions { BaseUrl = publicBaseUrl }),
            NullLogger<PaddleCheckoutReturnResolver>.Instance);
}
