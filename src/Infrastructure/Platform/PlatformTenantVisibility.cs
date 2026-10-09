using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Platform;

/// <summary>
/// Same hideLoadTest predicate as the tenant directory list.
/// </summary>
public static class PlatformTenantVisibility
{
    public static IQueryable<Tenant> ApplyHideLoadTest(IQueryable<Tenant> query, bool hideLoadTest)
    {
        if (!hideLoadTest)
        {
            return query;
        }

        return query.Where(t =>
            !t.Slug.ToLower().StartsWith("load-")
            && t.Id != TenantIds.Default
            && t.Slug.ToLower() != TenantIds.DefaultSlug.ToLowerInvariant());
    }
}
