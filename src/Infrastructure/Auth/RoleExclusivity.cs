using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Hard rule (Story 11.4 CR): a user must not hold both PlatformAdmin and tenant Admin.
/// PlatformAdmin = Cohestra ops; Admin = subscribed tenant operator.
/// </summary>
public static class RoleExclusivity
{
    public static async Task<bool> CanAssignPlatformAdminAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        ILogger logger)
    {
        if (await userManager.IsInRoleAsync(user, OperatorSeeder.AdminRole))
        {
            logger.LogWarning(
                "Refused PlatformAdmin for {Email}: user already has tenant Admin (roles are mutually exclusive).",
                user.Email);
            return false;
        }

        return true;
    }

    public static async Task<bool> CanAssignTenantAdminAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        ILogger logger)
    {
        if (await userManager.IsInRoleAsync(user, PlatformAdminSeeder.PlatformAdminRole))
        {
            logger.LogWarning(
                "Refused tenant Admin for {Email}: user already has PlatformAdmin (roles are mutually exclusive).",
                user.Email);
            return false;
        }

        return true;
    }
}
