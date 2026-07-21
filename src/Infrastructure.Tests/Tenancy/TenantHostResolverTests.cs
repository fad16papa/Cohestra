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
    [InlineData("[::1]:8080", "default")]
    public void ExtractSlug_follows_host_rules(string host, string expectedSlug)
    {
        var config = new ConfigurationBuilder().Build();
        Assert.Equal(expectedSlug, TenantHostResolver.ExtractSlug(host, config));
    }

    [Theory]
    [InlineData("acme.example.com")]
    [InlineData("foo.bar.cohestra.app")]
    [InlineData("evil.com")]
    [InlineData("cohestra.app")]
    [InlineData("www.cohestra.app")]
    public void ExtractSlug_rejects_non_allowlisted_or_marketing_hosts(string host)
    {
        var config = new ConfigurationBuilder().Build();
        Assert.Equal(string.Empty, TenantHostResolver.ExtractSlug(host, config));
    }

    [Theory]
    [InlineData("cohestra.app")]
    [InlineData("www.cohestra.app")]
    [InlineData("www.cohestra.app:443")]
    public void IsMarketingApexHost_detects_production_apex(string host)
    {
        Assert.True(TenantHostResolver.IsMarketingApexHost(host));
        Assert.False(TenantHostResolver.IsMarketingApexHost("localhost"));
        Assert.False(TenantHostResolver.IsMarketingApexHost("acme.cohestra.app"));
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
        Assert.False(result.IsMarketingHost);
    }

    [Fact]
    public async Task ResolveAsync_active_subdomain_localhost_sets_tenant()
    {
        await using var db = new CohestraDbContext(
            new DbContextOptionsBuilder<CohestraDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "acme",
            Name = "Acme",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var resolver = new TenantHostResolver(db, new ConfigurationBuilder().Build());
        var result = await resolver.ResolveAsync("acme.localhost");

        Assert.True(result.Succeeded);
        Assert.Equal(tenantId, result.TenantId);
        Assert.Equal("acme", result.Slug);
    }

    [Fact]
    public async Task ResolveAsync_marketing_apex_does_not_bind_default_tenant()
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
        var result = await resolver.ResolveAsync("cohestra.app");

        Assert.False(result.Succeeded);
        Assert.True(result.IsMarketingHost);
        Assert.Null(result.TenantId);
    }

    [Fact]
    public async Task ResolveAsync_rejects_suspended_tenant()
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
            Status = TenantStatus.Suspended,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var resolver = new TenantHostResolver(db, new ConfigurationBuilder().Build());
        var result = await resolver.ResolveAsync("localhost");

        Assert.False(result.Succeeded);
        Assert.False(result.IsMarketingHost);
        Assert.Contains("not available", result.ErrorDetail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ResolveAsync_unknown_slug_fails()
    {
        await using var db = new CohestraDbContext(
            new DbContextOptionsBuilder<CohestraDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        var resolver = new TenantHostResolver(db, new ConfigurationBuilder().Build());
        var result = await resolver.ResolveAsync("ghost.localhost");

        Assert.False(result.Succeeded);
        Assert.Contains("Unknown", result.ErrorDetail, StringComparison.OrdinalIgnoreCase);
    }
}
