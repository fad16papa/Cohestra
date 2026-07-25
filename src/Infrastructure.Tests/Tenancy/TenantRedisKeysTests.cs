using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantRedisKeysTests
{
    [Fact]
    public void PublishedSite_uses_tenant_prefix()
    {
        var key = TenantRedisKeys.PublishedSite(TenantIds.Default);
        Assert.Equal($"tenant:{TenantIds.Default:D}:public:site:published", key);
    }

    [Fact]
    public void PublicActivity_includes_slug()
    {
        var tenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        Assert.Equal(
            $"tenant:{tenantId:D}:public:activity:open-run",
            TenantRedisKeys.PublicActivity(tenantId, "open-run"));
    }

    [Fact]
    public void Dashboard_and_registration_keys_are_tenant_scoped()
    {
        var id = TenantIds.Default;
        Assert.StartsWith($"tenant:{id:D}:dashboard:", TenantRedisKeys.DashboardMetrics(id), StringComparison.Ordinal);
        Assert.StartsWith(
            $"tenant:{id:D}:ratelimit:public-registration:",
            TenantRedisKeys.PublicRegistrationRateLimit(id, "ABC"),
            StringComparison.Ordinal);
        Assert.StartsWith(
            $"tenant:{id:D}:idempotency:public-registration:",
            TenantRedisKeys.PublicRegistrationIdempotency(id, "ABC"),
            StringComparison.Ordinal);
        Assert.Contains(":lock:", TenantRedisKeys.PublicRegistrationIdempotencyLock(id, "ABC"), StringComparison.Ordinal);
    }
}
