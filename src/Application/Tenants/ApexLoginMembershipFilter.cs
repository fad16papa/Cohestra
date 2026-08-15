using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

/// <summary>
/// Resolves which memberships count for email-first login on marketing apex / bare localhost.
/// </summary>
public static class ApexLoginMembershipFilter
{
    private const string LoadTestSlugPrefix = "load-";

    /// <summary>
    /// Default-tenant memberships are often bootstrap backfill artifacts. When the operator
    /// also belongs to real workspace(s), apex login should resolve to those workspaces.
    /// </summary>
    public static IReadOnlyList<UserTenantMembership> ForEmailFirstLogin(
        IReadOnlyList<UserTenantMembership> memberships)
    {
        if (memberships.Count <= 1)
        {
            return memberships;
        }

        var hasDefault = memberships.Any(m =>
            string.Equals(m.TenantSlug, TenantIds.DefaultSlug, StringComparison.OrdinalIgnoreCase));
        if (!hasDefault)
        {
            return memberships;
        }

        var nonDefault = memberships
            .Where(m => !string.Equals(m.TenantSlug, TenantIds.DefaultSlug, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return nonDefault.Count > 0 ? nonDefault : memberships;
    }

    /// <summary>
    /// Pick a single workspace for apex login when possible; null when truly ambiguous.
    /// </summary>
    public static UserTenantMembership? ResolvePrimaryForEmailFirstLogin(
        IReadOnlyList<UserTenantMembership> memberships)
    {
        var candidates = ForEmailFirstLogin(memberships);
        if (candidates.Count == 0)
        {
            return null;
        }

        if (candidates.Count == 1)
        {
            return candidates[0];
        }

        var tenantAdmins = candidates
            .Where(m => m.Role == TenantMembershipRole.TenantAdmin)
            .ToList();
        if (tenantAdmins.Count > 0)
        {
            candidates = tenantAdmins;
        }

        if (candidates.Count == 1)
        {
            return candidates[0];
        }

        var realWorkspaces = candidates
            .Where(m => !IsLoadTestSlug(m.TenantSlug))
            .ToList();
        if (realWorkspaces.Count == 1)
        {
            return realWorkspaces[0];
        }

        if (realWorkspaces.Count > 1)
        {
            return null;
        }

        // Only load-test workspaces remain — pick the first stable ordering.
        return candidates
            .OrderBy(m => m.TenantSlug, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault();
    }

    private static bool IsLoadTestSlug(string slug) =>
        slug.StartsWith(LoadTestSlugPrefix, StringComparison.OrdinalIgnoreCase);
}
