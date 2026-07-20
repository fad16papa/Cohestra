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

        if (!seedSettings.Enabled)
        {
            logger.LogInformation("Platform admin user seed skipped (PlatformAdminSeed:Enabled=false).");
            return;
        }

        var existingUser = await userManager.FindByEmailAsync(seedSettings.Email);
        if (existingUser is not null)
        {
            if (!await userManager.IsInRoleAsync(existingUser, PlatformAdminRole))
            {
                await userManager.AddToRoleAsync(existingUser, PlatformAdminRole);
                logger.LogInformation("Added existing user {Email} to {Role}.", seedSettings.Email, PlatformAdminRole);
            }

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

        await userManager.AddToRoleAsync(user, PlatformAdminRole);
        logger.LogInformation("Seeded platform admin account {Email}.", seedSettings.Email);
    }
}
