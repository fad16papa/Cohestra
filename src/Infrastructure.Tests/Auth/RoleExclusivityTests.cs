using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class RoleExclusivityTests
{
    [Fact]
    public async Task Cannot_assign_PlatformAdmin_when_user_has_tenant_Admin()
    {
        await using var provider = BuildIdentity();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.TenantAdminRole));
        await roleManager.CreateAsync(new IdentityRole<Guid>(PlatformAdminSeeder.PlatformAdminRole));

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "dual@test.local",
            Email = "dual@test.local",
            EmailConfirmed = true,
        };
        Assert.True((await userManager.CreateAsync(user, "ChangeMe123!")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole)).Succeeded);

        var allowed = await RoleExclusivity.CanAssignPlatformAdminAsync(
            userManager,
            user,
            NullLogger.Instance);
        Assert.False(allowed);
    }

    [Fact]
    public async Task Cannot_assign_tenant_Admin_when_user_has_PlatformAdmin()
    {
        await using var provider = BuildIdentity();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.TenantAdminRole));
        await roleManager.CreateAsync(new IdentityRole<Guid>(PlatformAdminSeeder.PlatformAdminRole));

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "plat@test.local",
            Email = "plat@test.local",
            EmailConfirmed = true,
        };
        Assert.True((await userManager.CreateAsync(user, "ChangeMe123!")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(user, PlatformAdminSeeder.PlatformAdminRole)).Succeeded);

        var allowed = await RoleExclusivity.CanAssignTenantAdminAsync(
            userManager,
            user,
            NullLogger.Instance);
        Assert.False(allowed);
    }

    private static ServiceProvider BuildIdentity()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<CohestraDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CohestraDbContext>();
        return services.BuildServiceProvider();
    }
}
