using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantHostResolverTests
{
    [Theory]
    [InlineData("acme.cohestra.app", "acme")]
    [InlineData("acme.localhost:3000", "acme")]
    [InlineData("localhost", "default")]
    [InlineData("127.0.0.1", "default")]
    public void ExtractSlug_follows_host_rules(string host, string expectedSlug)
    {
        var config = new ConfigurationBuilder().Build();
        Assert.Equal(expectedSlug, TenantHostResolver.ExtractSlug(host, config));
    }

    [Fact]
    public void ExtractSlug_uses_DEV_TENANT_SLUG_on_localhost()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DEV_TENANT_SLUG"] = "ikigai",
            })
            .Build();

        Assert.Equal("ikigai", TenantHostResolver.ExtractSlug("localhost", config));
    }

    [Fact]
    public async Task ResolveAsync_maps_slug_to_tenant_id()
    {
        await using var db = new CohestraDbContext(
            new DbContextOptionsBuilder<CohestraDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var resolver = new TenantHostResolver(db, new ConfigurationBuilder().Build());
        var result = await resolver.ResolveAsync("localhost");

        Assert.True(result.Succeeded);
        Assert.Equal(TenantIds.Default, result.TenantId);
    }
}
