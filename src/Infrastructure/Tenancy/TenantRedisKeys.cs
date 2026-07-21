namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Redis key helpers for tenant-scoped caches (AD-6).
/// </summary>
public static class TenantRedisKeys
{
    public static string PublishedSite(Guid tenantId) =>
        $"tenant:{tenantId:D}:public:site:published";

    public static string PublicActivity(Guid tenantId, string normalizedSlug) =>
        $"tenant:{tenantId:D}:public:activity:{normalizedSlug}";

    public static string DashboardMetrics(Guid tenantId) =>
        $"tenant:{tenantId:D}:dashboard:metrics";

    public static string PublicRegistrationRateLimit(Guid tenantId, string clientHash) =>
        $"tenant:{tenantId:D}:ratelimit:public-registration:{clientHash}";

    public static string PublicRegistrationIdempotency(Guid tenantId, string keyHash) =>
        $"tenant:{tenantId:D}:idempotency:public-registration:{keyHash}";

    public static string PublicRegistrationIdempotencyLock(Guid tenantId, string keyHash) =>
        $"tenant:{tenantId:D}:idempotency:public-registration:lock:{keyHash}";
}
