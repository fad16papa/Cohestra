namespace Cohestra.Infrastructure.Platform;

using Cohestra.Domain.Tenants;

/// <summary>OQ-3: demo/load-test tenant detection for platform ops filters.</summary>
public static class PlatformTenantFlags
{
    private const string LoadTestSlugPrefix = "load-";

    public static bool IsDemoOrLoadTest(string slug, Guid tenantId) =>
        slug.StartsWith(LoadTestSlugPrefix, StringComparison.OrdinalIgnoreCase)
        || tenantId == TenantIds.Default
        || string.Equals(slug, TenantIds.DefaultSlug, StringComparison.OrdinalIgnoreCase);
}
