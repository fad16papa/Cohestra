namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Named authorization policies for tenant membership claim type
/// <see cref="JwtTokenService.MembershipRoleClaimType"/> ("role").
/// Keep distinct from Identity <c>ClaimTypes.Role</c> / PlatformAdmin gates.
/// </summary>
public static class TenantAuthPolicies
{
    /// <summary>TenantAdmin membership only — team, billing, tenant settings, SendGrid.</summary>
    public const string TenantAdminOnly = "TenantAdminOnly";

    /// <summary>TenantAdmin or TenantMember — operational modules within plan.</summary>
    public const string TenantOperator = "TenantOperator";
}
