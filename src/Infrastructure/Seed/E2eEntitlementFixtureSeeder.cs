using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Seed;

/// <summary>
/// Development/demo-seed only. Provisions the Basic entitlement fixture used by live E2E
/// (<c>px2-basic</c> / <c>px2-basic-admin@cohestra.local</c>). Cannot run when
/// <see cref="DemoDataSeedSettings.Enabled"/> is false — Production rejects that flag.
/// </summary>
public static class E2eEntitlementFixtureSeeder
{
    public const string TenantSlug = "px2-basic";
    public const string TenantName = "PX2 Basic Fixture";
    public const string AdminEmail = "px2-basic-admin@cohestra.local";

    public static bool IsFixtureAdminEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Trim().Equals(AdminEmail, StringComparison.OrdinalIgnoreCase);

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<DemoDataSeedSettings>>().Value;
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("E2eEntitlementFixtureSeeder");

        if (!settings.Enabled)
        {
            logger.LogInformation("E2E entitlement fixture skipped (DemoDataSeed:Enabled=false).");
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var operatorSettings = scope.ServiceProvider.GetRequiredService<IOptions<OperatorSeedSettings>>().Value;
        var password = string.IsNullOrWhiteSpace(operatorSettings.Password)
            ? "ChangeMe123!"
            : operatorSettings.Password;

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        var tenant = await EnsureBasicTenantAsync(db, logger, cancellationToken);
        await EnsureAdminUserAsync(userManager, db, tenant.Id, password, logger, cancellationToken);
    }

    internal static async Task<Tenant> EnsureBasicTenantAsync(
        CohestraDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(item => item.Slug == TenantSlug, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (tenant is null)
        {
            tenant = new Tenant
            {
                Id = Guid.CreateVersion7(),
                Slug = TenantSlug,
                Name = TenantName,
                AdminContactEmail = AdminEmail,
                Plan = TenantPlan.Basic,
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                IsComplimentary = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Created E2E Basic fixture tenant {Slug}.", TenantSlug);
            return tenant;
        }

        var dirty = false;
        if (tenant.Plan != TenantPlan.Basic)
        {
            tenant.Plan = TenantPlan.Basic;
            dirty = true;
        }

        if (tenant.Status != TenantStatus.Active)
        {
            tenant.Status = TenantStatus.Active;
            tenant.SuspendedAt = null;
            tenant.ArchivedAt = null;
            dirty = true;
        }

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            tenant.AdminContactEmail = AdminEmail;
            dirty = true;
        }

        if (dirty)
        {
            tenant.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Restored E2E Basic fixture tenant {Slug} to Active/Basic.", TenantSlug);
        }

        return tenant;
    }

    internal static async Task EnsureAdminUserAsync(
        UserManager<ApplicationUser> userManager,
        CohestraDbContext db,
        Guid tenantId,
        string password,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(AdminEmail);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = AdminEmail,
                Email = AdminEmail,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to seed E2E Basic fixture admin: " +
                    string.Join("; ", createResult.Errors.Select(error => error.Description)));
            }

            if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
            {
                await userManager.DeleteAsync(user);
                throw new InvalidOperationException(
                    $"Failed to seed E2E Basic fixture admin {AdminEmail}: role exclusivity conflict.");
            }

            var roleResult = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to assign TenantAdmin to E2E Basic fixture admin: " +
                    string.Join("; ", roleResult.Errors.Select(error => error.Description)));
            }

            logger.LogInformation("Seeded E2E Basic fixture admin {Email}.", AdminEmail);
        }
        else
        {
            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                var confirm = await userManager.UpdateAsync(user);
                if (!confirm.Succeeded)
                {
                    throw new InvalidOperationException(
                        "Failed to confirm E2E Basic fixture admin email: " +
                        string.Join("; ", confirm.Errors.Select(error => error.Description)));
                }
            }

            if (!await userManager.CheckPasswordAsync(user, password))
            {
                var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
                var reset = await userManager.ResetPasswordAsync(user, resetToken, password);
                if (!reset.Succeeded)
                {
                    throw new InvalidOperationException(
                        "Failed to reset E2E Basic fixture admin password: " +
                        string.Join("; ", reset.Errors.Select(error => error.Description)));
                }
            }

            if (!await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
            {
                if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
                {
                    throw new InvalidOperationException(
                        $"Cannot assign TenantAdmin to {AdminEmail}: role exclusivity conflict.");
                }

                var roleResult = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
                if (!roleResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        "Failed to assign TenantAdmin to E2E Basic fixture admin: " +
                        string.Join("; ", roleResult.Errors.Select(error => error.Description)));
                }
            }
        }

        var exists = await db.TenantMemberships.AnyAsync(
            membership => membership.UserId == user.Id && membership.TenantId == tenantId,
            cancellationToken);
        if (exists)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        db.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TenantId = tenantId,
            Role = TenantMembershipRole.TenantAdmin,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Linked E2E Basic fixture admin {Email} to tenant {Slug}.",
            AdminEmail,
            TenantSlug);
    }
}
