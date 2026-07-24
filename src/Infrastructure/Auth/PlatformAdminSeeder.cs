using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Auth;

public static class PlatformAdminSeeder
{
    public const string PlatformAdminRole = "PlatformAdmin";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("PlatformAdminSeeder");
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var seedSettings = scope.ServiceProvider.GetRequiredService<IOptions<PlatformAdminSeedSettings>>().Value;

        if (!await roleManager.RoleExistsAsync(PlatformAdminRole))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(PlatformAdminRole));
            logger.LogInformation("Created role {Role}.", PlatformAdminRole);
        }

        // Ensure legacy Admin → TenantAdmin rename runs even when Platform seed is first.
        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        if (!seedSettings.Enabled)
        {
            logger.LogInformation("Platform admin user seed skipped (PlatformAdminSeed:Enabled=false).");
            return;
        }

        var existingUser = await userManager.FindByEmailAsync(seedSettings.Email);
        if (existingUser is not null)
        {
            if (await userManager.IsInRoleAsync(existingUser, PlatformAdminRole))
            {
                return;
            }

            if (!await RoleExclusivity.CanAssignPlatformAdminAsync(userManager, existingUser, logger))
            {
                throw new InvalidOperationException(
                    $"PlatformAdmin seed blocked for {seedSettings.Email}: user already has TenantAdmin (roles are mutually exclusive).");
            }

            var addResult = await userManager.AddToRoleAsync(existingUser, PlatformAdminRole);
            if (!addResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to add PlatformAdmin role: {string.Join(", ", addResult.Errors.Select(e => e.Description))}");
            }

            logger.LogInformation("Added existing user {Email} to {Role}.", seedSettings.Email, PlatformAdminRole);
            return;
        }

        var user = new ApplicationUser
        {
            UserName = seedSettings.Email,
            Email = seedSettings.Email,
            EmailConfirmed = true,
        };

        var result = await userManager.CreateAsync(user, seedSettings.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to seed platform admin account: {errors}");
        }

        if (!await RoleExclusivity.CanAssignPlatformAdminAsync(userManager, user, logger))
        {
            await userManager.DeleteAsync(user);
            throw new InvalidOperationException(
                $"Failed to seed platform admin account: email {seedSettings.Email} conflicts with TenantAdmin exclusivity.");
        }

        var roleResult = await userManager.AddToRoleAsync(user, PlatformAdminRole);
        if (!roleResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to assign PlatformAdmin role: {string.Join(", ", roleResult.Errors.Select(e => e.Description))}");
        }

        logger.LogInformation("Seeded platform admin account {Email}.", seedSettings.Email);
    }
}
