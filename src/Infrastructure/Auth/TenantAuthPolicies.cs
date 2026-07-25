namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Named authorization policies for membership claim type
/// <see cref="JwtTokenService.MembershipRoleClaimType"/> ("role")
/// and platform claim <see cref="JwtTokenService.PlatformAdminClaimType"/>.
/// Keep distinct from Identity <c>ClaimTypes.Role</c>.
/// </summary>
public static class TenantAuthPolicies
{
    /// <summary>TenantAdmin membership only — team, billing, tenant settings, SendGrid.</summary>
    public const string TenantAdminOnly = "TenantAdminOnly";

    /// <summary>TenantAdmin or TenantMember — operational modules within plan.</summary>
    public const string TenantOperator = "TenantOperator";

    /// <summary>Platform Admin claim <c>platform_admin=true</c> — /api/v1/platform/* only.</summary>
    public const string PlatformAdminOnly = "PlatformAdminOnly";
}
