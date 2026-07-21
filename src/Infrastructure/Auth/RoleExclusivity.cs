using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Hard rule (Story 11.4 CR): a user must not hold both PlatformAdmin and TenantAdmin.
/// PlatformAdmin = Cohestra ops; TenantAdmin = subscribed tenant operator (PRD).
/// </summary>
public static class RoleExclusivity
{
    public static async Task<bool> CanAssignPlatformAdminAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        ILogger logger)
    {
        if (await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
        {
            logger.LogWarning(
                "Refused PlatformAdmin for {Email}: user already has TenantAdmin (roles are mutually exclusive).",
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
                "Refused TenantAdmin for {Email}: user already has PlatformAdmin (roles are mutually exclusive).",
                user.Email);
            return false;
        }

        return true;
    }
}
