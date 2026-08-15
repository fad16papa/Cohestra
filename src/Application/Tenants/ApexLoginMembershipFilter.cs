using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

/// <summary>
/// Resolves which memberships count for email-first login on marketing apex / bare localhost.
/// </summary>
public static class ApexLoginMembershipFilter
{
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
}
