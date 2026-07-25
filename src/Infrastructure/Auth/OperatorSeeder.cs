using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Auth;

public static class OperatorSeeder
{
    /// <summary>PRD Tenant Admin — subscribed org operator (not PlatformAdmin).</summary>
    public const string TenantAdminRole = "TenantAdmin";

    /// <summary>Legacy Identity role name before Story 11.4 rename.</summary>
    public const string LegacyAdminRole = "Admin";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("OperatorSeeder");
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var seedSettings = scope.ServiceProvider.GetRequiredService<IOptions<OperatorSeedSettings>>().Value;

        await EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        if (seedSettings.Enabled)
        {
            await SeedOperatorUserAsync(userManager, seedSettings, logger, cancellationToken);
        }
        else
        {
            logger.LogInformation("Operator seed skipped (OperatorSeed:Enabled=false).");
        }

        await BackfillDefaultTenantAdminMembershipsAsync(userManager, db, logger, cancellationToken);
    }

    private static async Task SeedOperatorUserAsync(
        UserManager<ApplicationUser> userManager,
        OperatorSeedSettings seedSettings,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var admins = await userManager.GetUsersInRoleAsync(TenantAdminRole);
        if (admins.Count > 0)
        {
            logger.LogInformation(
                "Operator user seed skipped — workspace already has {Count} tenant admin account(s).",
                admins.Count);
            return;
        }

        var existingUser = await userManager.FindByEmailAsync(seedSettings.Email);
        if (existingUser is not null)
        {
            if (await userManager.IsInRoleAsync(existingUser, TenantAdminRole))
            {
                return;
            }

            if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, existingUser, logger))
            {
                throw new InvalidOperationException(
                    $"Operator seed blocked for {seedSettings.Email}: user already has PlatformAdmin (roles are mutually exclusive).");
            }

            var addResult = await userManager.AddToRoleAsync(existingUser, TenantAdminRole);
            if (!addResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to add TenantAdmin role: {string.Join(", ", addResult.Errors.Select(e => e.Description))}");
            }

            logger.LogInformation("Added existing user {Email} to {Role}.", seedSettings.Email, TenantAdminRole);
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

        if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
        {
            await userManager.DeleteAsync(user);
            throw new InvalidOperationException(
                $"Failed to seed operator account: email {seedSettings.Email} conflicts with PlatformAdmin exclusivity.");
        }

        var roleResult = await userManager.AddToRoleAsync(user, TenantAdminRole);
        if (!roleResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to assign TenantAdmin role: {string.Join(", ", roleResult.Errors.Select(e => e.Description))}");
        }

        logger.LogInformation("Seeded tenant admin account {Email}.", seedSettings.Email);
    }

    /// <summary>
    /// Idempotent: every Identity TenantAdmin who is not PlatformAdmin gets TenantAdmin membership on default.
    /// </summary>
    public static async Task BackfillDefaultTenantAdminMembershipsAsync(
        UserManager<ApplicationUser> userManager,
        CohestraDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var defaultExists = await db.Tenants.AnyAsync(t => t.Id == TenantIds.Default, cancellationToken);
        if (!defaultExists)
        {
            logger.LogWarning(
                "Skipped TenantMembership backfill — default tenant {TenantId} is missing.",
                TenantIds.Default);
            return;
        }

        var admins = await userManager.GetUsersInRoleAsync(TenantAdminRole);
        var linked = 0;
        foreach (var admin in admins)
        {
            if (await userManager.IsInRoleAsync(admin, PlatformAdminSeeder.PlatformAdminRole))
            {
                continue;
            }

            var exists = await db.TenantMemberships.AnyAsync(
                m => m.UserId == admin.Id && m.TenantId == TenantIds.Default,
                cancellationToken);
            if (exists)
            {
                continue;
            }

            var now = DateTimeOffset.UtcNow;
            db.TenantMemberships.Add(new TenantMembership
            {
                Id = Guid.CreateVersion7(),
                UserId = admin.Id,
                TenantId = TenantIds.Default,
                Role = TenantMembershipRole.TenantAdmin,
                CreatedAt = now,
                UpdatedAt = now,
            });
            linked++;
        }

        if (linked > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "Backfilled {Count} TenantAdmin membership(s) on default tenant.",
                linked);
        }
    }

    /// <summary>
    /// Ensures Identity role <c>TenantAdmin</c> exists, renaming legacy <c>Admin</c> when present.
    /// </summary>
    public static async Task EnsureTenantAdminRoleAsync(
        RoleManager<IdentityRole<Guid>> roleManager,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var legacy = await roleManager.FindByNameAsync(LegacyAdminRole);
        if (legacy is not null && !await roleManager.RoleExistsAsync(TenantAdminRole))
        {
            legacy.Name = TenantAdminRole;
            legacy.NormalizedName = roleManager.NormalizeKey(TenantAdminRole);
            var update = await roleManager.UpdateAsync(legacy);
            if (!update.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to rename Identity role {LegacyAdminRole} → {TenantAdminRole}: " +
                    string.Join(", ", update.Errors.Select(e => e.Description)));
            }

            logger.LogInformation(
                "Renamed Identity role {Legacy} → {Current} (PRD Tenant Admin alignment).",
                LegacyAdminRole,
                TenantAdminRole);
        }
        else if (legacy is not null)
        {
            logger.LogWarning(
                "Both Identity roles {Legacy} and {Current} exist; canonical role is {Current}. Remove {Legacy} manually if unused.",
                LegacyAdminRole,
                TenantAdminRole,
                TenantAdminRole,
                LegacyAdminRole);
        }

        if (!await roleManager.RoleExistsAsync(TenantAdminRole))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(TenantAdminRole));
            logger.LogInformation("Created role {Role}.", TenantAdminRole);
        }
    }
}
