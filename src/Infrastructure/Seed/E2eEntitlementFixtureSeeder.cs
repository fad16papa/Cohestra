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
/// Development/demo-seed only. Provisions D12 entitlement fixtures used by live E2E.
/// Cannot run when <see cref="DemoDataSeedSettings.Enabled"/> is false — Production rejects that flag.
/// </summary>
public static class E2eEntitlementFixtureSeeder
{
    public const string TenantSlug = "px2-basic";
    public const string TenantName = "PX2 Basic Fixture";
    public const string AdminEmail = "px2-basic-admin@cohestra.local";
    public const string AdminPassword = "ChangeMe123!";

    public const string CoreTenantSlug = "px2-core";
    public const string CoreTenantName = "PX2 Core Fixture";
    public const string CoreAdminEmail = "px2-core-admin@cohestra.local";

    public const string MemberEmail = "px2-pro-member@cohestra.local";

    public static bool IsFixtureAdminEmail(string? email) =>
        MatchesEmail(email, AdminEmail) || MatchesEmail(email, CoreAdminEmail);

    public static bool IsFixtureAccountEmail(string? email) =>
        IsFixtureAdminEmail(email) || MatchesEmail(email, MemberEmail);

    private static bool MatchesEmail(string? email, string expected) =>
        !string.IsNullOrWhiteSpace(email)
        && email.Trim().Equals(expected, StringComparison.OrdinalIgnoreCase);

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

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        var basicTenant = await EnsurePlanTenantAsync(
            db,
            TenantSlug,
            TenantName,
            AdminEmail,
            TenantPlan.Basic,
            logger,
            cancellationToken);
        await EnsureAdminUserAsync(
            userManager,
            db,
            basicTenant.Id,
            AdminEmail,
            logger,
            cancellationToken);

        var coreTenant = await EnsurePlanTenantAsync(
            db,
            CoreTenantSlug,
            CoreTenantName,
            CoreAdminEmail,
            TenantPlan.Core,
            logger,
            cancellationToken);
        await EnsureAdminUserAsync(
            userManager,
            db,
            coreTenant.Id,
            CoreAdminEmail,
            logger,
            cancellationToken);

        await EnsureDefaultTenantMemberAsync(userManager, db, logger, cancellationToken);
    }

    internal static async Task<Tenant> EnsureBasicTenantAsync(
        CohestraDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default) =>
        await EnsurePlanTenantAsync(
            db,
            TenantSlug,
            TenantName,
            AdminEmail,
            TenantPlan.Basic,
            logger,
            cancellationToken);

    internal static async Task<Tenant> EnsurePlanTenantAsync(
        CohestraDbContext db,
        string slug,
        string name,
        string adminEmail,
        TenantPlan plan,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(item => item.Slug == slug, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (tenant is null)
        {
            tenant = new Tenant
            {
                Id = Guid.CreateVersion7(),
                Slug = slug,
                Name = name,
                AdminContactEmail = adminEmail,
                Plan = plan,
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                IsComplimentary = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Created E2E {Plan} fixture tenant {Slug}.", plan, slug);
            return tenant;
        }

        var dirty = false;
        if (tenant.Plan != plan)
        {
            tenant.Plan = plan;
            dirty = true;
        }

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            tenant.AdminContactEmail = adminEmail;
            dirty = true;
        }

        if (dirty)
        {
            tenant.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Restored E2E fixture tenant {Slug} plan to {Plan}.", slug, plan);
        }

        return tenant;
    }

    internal static async Task EnsureAdminUserAsync(
        UserManager<ApplicationUser> userManager,
        CohestraDbContext db,
        Guid tenantId,
        string email,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, AdminPassword);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to seed E2E fixture admin {email}: " +
                    string.Join("; ", createResult.Errors.Select(error => error.Description)));
            }

            if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
            {
                await userManager.DeleteAsync(user);
                throw new InvalidOperationException(
                    $"Failed to seed E2E fixture admin {email}: role exclusivity conflict.");
            }

            var roleResult = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to assign TenantAdmin to E2E fixture admin {email}: " +
                    string.Join("; ", roleResult.Errors.Select(error => error.Description)));
            }

            logger.LogInformation("Seeded E2E fixture admin {Email}.", email);
        }
        else if (!await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
        {
            logger.LogWarning(
                "E2E fixture email {Email} already exists without TenantAdmin; not rewriting the account.",
                email);
            return;
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
        logger.LogInformation("Linked E2E fixture admin {Email} to tenant {TenantId}.", email, tenantId);
    }

    internal static async Task EnsureDefaultTenantMemberAsync(
        UserManager<ApplicationUser> userManager,
        CohestraDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var defaultTenant = await db.Tenants.FirstOrDefaultAsync(
            tenant => tenant.Id == TenantIds.Default,
            cancellationToken);
        if (defaultTenant is null)
        {
            logger.LogWarning("Skipped E2E member fixture — default tenant is missing.");
            return;
        }

        var user = await userManager.FindByEmailAsync(MemberEmail);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = MemberEmail,
                Email = MemberEmail,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, AdminPassword);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to seed E2E fixture member: " +
                    string.Join("; ", createResult.Errors.Select(error => error.Description)));
            }

            logger.LogInformation("Seeded E2E fixture member {Email}.", MemberEmail);
        }

        var exists = await db.TenantMemberships.AnyAsync(
            membership => membership.UserId == user.Id && membership.TenantId == TenantIds.Default,
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
            TenantId = TenantIds.Default,
            Role = TenantMembershipRole.TenantMember,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Linked E2E fixture member {Email} to default tenant.", MemberEmail);
    }
}
