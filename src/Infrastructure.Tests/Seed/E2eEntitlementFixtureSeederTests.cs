using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class E2eEntitlementFixtureSeederTests
{
    [Fact]
    public void TenantSlug_IsValidAndNotReserved()
    {
        Assert.Null(TenantSlugRules.ValidateForProvision(E2eEntitlementFixtureSeeder.TenantSlug));
        Assert.Equal("px2-basic", E2eEntitlementFixtureSeeder.TenantSlug);
        Assert.True(E2eEntitlementFixtureSeeder.IsFixtureAdminEmail("px2-basic-admin@cohestra.local"));
        Assert.True(E2eEntitlementFixtureSeeder.IsFixtureAdminEmail("PX2-Basic-Admin@cohestra.local"));
        Assert.False(E2eEntitlementFixtureSeeder.IsFixtureAdminEmail("operator@cohestra.local"));
        Assert.False(E2eEntitlementFixtureSeeder.IsFixtureAdminEmail(null));
    }

    [Fact]
    public async Task SeedAsync_WhenDemoDataDisabled_DoesNothing()
    {
        await using var provider = BuildServices(demoEnabled: false);
        var db = provider.GetRequiredService<CohestraDbContext>();
        SeedDefaultTenant(db);

        await E2eEntitlementFixtureSeeder.SeedAsync(provider);

        Assert.False(await db.Tenants.AnyAsync(tenant => tenant.Slug == E2eEntitlementFixtureSeeder.TenantSlug));
        Assert.Null(await provider.GetRequiredService<UserManager<ApplicationUser>>()
            .FindByEmailAsync(E2eEntitlementFixtureSeeder.AdminEmail));
    }

    [Fact]
    public async Task SeedAsync_WhenEnabled_CreatesBasicTenantAndConfirmedAdmin()
    {
        await using var provider = BuildServices(demoEnabled: true);
        Assert.True(provider.GetRequiredService<IOptions<DemoDataSeedSettings>>().Value.Enabled);
        var db = provider.GetRequiredService<CohestraDbContext>();
        SeedDefaultTenant(db);

        await E2eEntitlementFixtureSeeder.SeedAsync(provider);

        var tenant = await db.Tenants.SingleAsync(item => item.Slug == E2eEntitlementFixtureSeeder.TenantSlug);
        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(TenantStatus.Active, tenant.Status);
        Assert.Equal(E2eEntitlementFixtureSeeder.AdminEmail, tenant.AdminContactEmail);

        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var admin = await userManager.FindByEmailAsync(E2eEntitlementFixtureSeeder.AdminEmail);
        Assert.NotNull(admin);
        Assert.True(admin.EmailConfirmed);
        Assert.True(await userManager.CheckPasswordAsync(admin, "ChangeMe123!"));
        Assert.True(await userManager.IsInRoleAsync(admin, OperatorSeeder.TenantAdminRole));

        var membership = Assert.Single(await db.TenantMemberships.ToListAsync());
        Assert.Equal(admin.Id, membership.UserId);
        Assert.Equal(tenant.Id, membership.TenantId);
        Assert.Equal(TenantMembershipRole.TenantAdmin, membership.Role);
        Assert.NotEqual(TenantIds.Default, membership.TenantId);
    }

    [Fact]
    public async Task SeedAsync_RestoresPlanToBasicWithoutTouchingDefault()
    {
        await using var provider = BuildServices(demoEnabled: true);
        var db = provider.GetRequiredService<CohestraDbContext>();
        SeedDefaultTenant(db, TenantPlan.Pro);

        db.Tenants.Add(new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = E2eEntitlementFixtureSeeder.TenantSlug,
            Name = E2eEntitlementFixtureSeeder.TenantName,
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        await E2eEntitlementFixtureSeeder.SeedAsync(provider);

        db.ChangeTracker.Clear();
        var fixture = await db.Tenants.SingleAsync(item => item.Slug == E2eEntitlementFixtureSeeder.TenantSlug);
        var defaultTenant = await db.Tenants.SingleAsync(item => item.Id == TenantIds.Default);
        Assert.Equal(TenantPlan.Basic, fixture.Plan);
        Assert.Equal(TenantPlan.Pro, defaultTenant.Plan);
    }

    [Fact]
    public async Task SeedAsync_IsIdempotent()
    {
        await using var provider = BuildServices(demoEnabled: true);
        SeedDefaultTenant(provider.GetRequiredService<CohestraDbContext>());

        await E2eEntitlementFixtureSeeder.SeedAsync(provider);
        await E2eEntitlementFixtureSeeder.SeedAsync(provider);

        var db = provider.GetRequiredService<CohestraDbContext>();
        Assert.Equal(1, await db.Tenants.CountAsync(item => item.Slug == E2eEntitlementFixtureSeeder.TenantSlug));
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task Backfill_skips_fixture_admin_even_without_workspace_membership()
    {
        await using var provider = BuildServices(demoEnabled: false);
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var db = provider.GetRequiredService<CohestraDbContext>();
        SeedDefaultTenant(db);
        await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.TenantAdminRole));

        var fixtureAdmin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = E2eEntitlementFixtureSeeder.AdminEmail,
            Email = E2eEntitlementFixtureSeeder.AdminEmail,
            EmailConfirmed = true,
        };
        Assert.True((await userManager.CreateAsync(fixtureAdmin, "ChangeMe123!")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(fixtureAdmin, OperatorSeeder.TenantAdminRole)).Succeeded);

        await OperatorSeeder.BackfillDefaultTenantAdminMembershipsAsync(
            userManager,
            db,
            NullLogger.Instance);

        Assert.Empty(await db.TenantMemberships.ToListAsync());
    }

    private static void SeedDefaultTenant(CohestraDbContext db, TenantPlan plan = TenantPlan.Basic)
    {
        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.SaveChanges();
    }

    private static ServiceProvider BuildServices(bool demoEnabled)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        var databaseName = Guid.NewGuid().ToString();
        services.AddDbContext<CohestraDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CohestraDbContext>()
            .AddDefaultTokenProviders();
        services.AddSingleton<IOptions<DemoDataSeedSettings>>(
            new OptionsWrapper<DemoDataSeedSettings>(new DemoDataSeedSettings { Enabled = demoEnabled }));
        services.AddSingleton<IOptions<OperatorSeedSettings>>(
            new OptionsWrapper<OperatorSeedSettings>(new OperatorSeedSettings
            {
                Enabled = false,
                Password = "ChangeMe123!",
            }));
        return services.BuildServiceProvider();
    }
}
