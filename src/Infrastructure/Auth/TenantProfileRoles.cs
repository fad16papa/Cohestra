using System.Security.Claims;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Profile role signal for admin/me: prefer membership claim when present;
/// keep Identity PlatformAdmin if present. Avoid advertising Identity TenantAdmin
/// when membership says TenantMember.
/// </summary>
public static class TenantProfileRoles
{
    public static string[] FromPrincipal(ClaimsPrincipal user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var membershipRoles = user.FindAll(JwtTokenService.MembershipRoleClaimType)
            .Select(c => c.Value)
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var identityRoles = user.FindAll(ClaimTypes.Role)
            .Select(c => c.Value)
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (membershipRoles.Length == 0)
        {
            return identityRoles;
        }

        var platformAdmin = identityRoles
            .Where(r => string.Equals(r, PlatformAdminSeeder.PlatformAdminRole, StringComparison.Ordinal));

        return membershipRoles
            .Concat(platformAdmin)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }
}
