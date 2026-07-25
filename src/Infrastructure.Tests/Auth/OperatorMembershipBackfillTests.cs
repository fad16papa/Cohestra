using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class OperatorMembershipBackfillTests
{
    [Fact]
    public async Task Backfill_links_TenantAdmin_to_default_and_skips_PlatformAdmin()
    {
        await using var provider = BuildIdentity();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var db = provider.GetRequiredService<CohestraDbContext>();

        await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.TenantAdminRole));
        await roleManager.CreateAsync(new IdentityRole<Guid>(PlatformAdminSeeder.PlatformAdminRole));

        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var operatorUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "op@test.local",
            Email = "op@test.local",
            EmailConfirmed = true,
        };
        Assert.True((await userManager.CreateAsync(operatorUser, "ChangeMe123!")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(operatorUser, OperatorSeeder.TenantAdminRole)).Succeeded);

        var platformUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "pa@test.local",
            Email = "pa@test.local",
            EmailConfirmed = true,
        };
        Assert.True((await userManager.CreateAsync(platformUser, "ChangeMe123!")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(platformUser, PlatformAdminSeeder.PlatformAdminRole)).Succeeded);
        // Dual-role should not happen in prod; if someone is both, backfill still skips PlatformAdmin check first.
        // Only TenantAdmin-without-PlatformAdmin is linked.

        await OperatorSeeder.BackfillDefaultTenantAdminMembershipsAsync(
            userManager,
            db,
            NullLogger.Instance);

        var memberships = await db.TenantMemberships.ToListAsync();
        Assert.Single(memberships);
        Assert.Equal(operatorUser.Id, memberships[0].UserId);
        Assert.Equal(TenantIds.Default, memberships[0].TenantId);
        Assert.Equal(TenantMembershipRole.TenantAdmin, memberships[0].Role);

        // Idempotent
        await OperatorSeeder.BackfillDefaultTenantAdminMembershipsAsync(
            userManager,
            db,
            NullLogger.Instance);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    private static ServiceProvider BuildIdentity()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<CohestraDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CohestraDbContext>()
            .AddDefaultTokenProviders();
        return services.BuildServiceProvider();
    }
}
