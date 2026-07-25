using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class TenantAdminRoleRenameTests
{
    [Fact]
    public async Task EnsureTenantAdminRole_renames_legacy_Admin_to_TenantAdmin()
    {
        await using var provider = BuildIdentity();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        Assert.True((await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.LegacyAdminRole))).Succeeded);

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, NullLogger.Instance);

        Assert.False(await roleManager.RoleExistsAsync(OperatorSeeder.LegacyAdminRole));
        Assert.True(await roleManager.RoleExistsAsync(OperatorSeeder.TenantAdminRole));
    }

    private static ServiceProvider BuildIdentity()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<CohestraDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services
            .AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CohestraDbContext>();
        return services.BuildServiceProvider();
    }
}
