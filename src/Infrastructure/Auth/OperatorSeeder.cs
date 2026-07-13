using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Auth;

public static class OperatorSeeder
{
    public const string AdminRole = "Admin";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("OperatorSeeder");
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var seedSettings = scope.ServiceProvider.GetRequiredService<IOptions<OperatorSeedSettings>>().Value;

        if (!await roleManager.RoleExistsAsync(AdminRole))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(AdminRole));
            logger.LogInformation("Created role {Role}.", AdminRole);
        }

        if (!seedSettings.Enabled)
        {
            logger.LogInformation("Operator seed skipped (OperatorSeed:Enabled=false).");
            return;
        }

        var admins = await userManager.GetUsersInRoleAsync(AdminRole);
        if (admins.Count > 0)
        {
            logger.LogInformation(
                "Operator seed skipped — workspace already has {Count} operator account(s).",
                admins.Count);
            return;
        }

        var existingUser = await userManager.FindByEmailAsync(seedSettings.Email);
        if (existingUser is not null)
        {
            return;
        }

        var user = new ApplicationUser
        {
            UserName = seedSettings.Email,
            Email = seedSettings.Email,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, seedSettings.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to seed operator account: {errors}");
        }

        await userManager.AddToRoleAsync(user, AdminRole);
        logger.LogInformation("Seeded operator account {Email}.", seedSettings.Email);
    }
}
