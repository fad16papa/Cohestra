using System.Security.Claims;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class TenantMembershipAuthorizationTests
{
    [Fact]
    public async Task TenantAdminOnly_allows_admin_membership_claim()
    {
        var auth = BuildAuthorizationService();
        var user = Principal(
            tenantId: TenantIds.Default,
            membershipRole: TenantMembershipRole.TenantAdmin);

        var result = await auth.AuthorizeAsync(user, resource: null, TenantAuthPolicies.TenantAdminOnly);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task TenantAdminOnly_denies_member_membership_claim()
    {
        var auth = BuildAuthorizationService();
        var user = Principal(
            tenantId: TenantIds.Default,
            membershipRole: TenantMembershipRole.TenantMember);

        var result = await auth.AuthorizeAsync(user, resource: null, TenantAuthPolicies.TenantAdminOnly);

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task TenantOperator_allows_member_and_admin()
    {
        var auth = BuildAuthorizationService();

        var admin = await auth.AuthorizeAsync(
            Principal(TenantIds.Default, TenantMembershipRole.TenantAdmin),
            null,
            TenantAuthPolicies.TenantOperator);
        var member = await auth.AuthorizeAsync(
            Principal(TenantIds.Default, TenantMembershipRole.TenantMember),
            null,
            TenantAuthPolicies.TenantOperator);

        Assert.True(admin.Succeeded);
        Assert.True(member.Succeeded);
    }

    [Fact]
    public async Task TenantOperator_denies_identity_role_without_membership_claim()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, OperatorSeeder.TenantAdminRole),
            new(JwtTokenService.TenantIdClaimType, TenantIds.Default.ToString()),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var result = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantOperator);

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Policies_require_tenant_id_claim()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantAdmin.ToString()),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var adminOnly = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantAdminOnly);
        var op = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantOperator);

        Assert.False(adminOnly.Succeeded);
        Assert.False(op.Succeeded);
    }

    [Fact]
    public async Task Policies_deny_malformed_tenant_id()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(JwtTokenService.TenantIdClaimType, "not-a-guid"),
            new(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantAdmin.ToString()),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var adminOnly = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantAdminOnly);
        var op = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantOperator);

        Assert.False(adminOnly.Succeeded);
        Assert.False(op.Succeeded);
    }

    [Fact]
    public async Task Policies_deny_empty_guid_tenant_id()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(JwtTokenService.TenantIdClaimType, Guid.Empty.ToString()),
            new(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantAdmin.ToString()),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var adminOnly = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantAdminOnly);
        var op = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.TenantOperator);

        Assert.False(adminOnly.Succeeded);
        Assert.False(op.Succeeded);
    }

    [Fact]
    public async Task PlatformAdminOnly_allows_platform_admin_claim()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, PlatformAdminSeeder.PlatformAdminRole),
            new(JwtTokenService.PlatformAdminClaimType, JwtTokenService.PlatformAdminClaimValue),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var result = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.PlatformAdminOnly);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task PlatformAdminOnly_denies_tenant_membership_without_platform_claim()
    {
        var auth = BuildAuthorizationService();
        var user = Principal(TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var result = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.PlatformAdminOnly);

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task PlatformAdminOnly_denies_identity_PlatformAdmin_without_claim()
    {
        var auth = BuildAuthorizationService();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, PlatformAdminSeeder.PlatformAdminRole),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));

        var result = await auth.AuthorizeAsync(user, null, TenantAuthPolicies.PlatformAdminOnly);

        Assert.False(result.Succeeded);
    }

    private static IAuthorizationService BuildAuthorizationService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options => options.AddTenantMembershipPolicies());
        services.AddSingleton<IAuthorizationHandlerContextFactory, DefaultAuthorizationHandlerContextFactory>();
        // Authorization service + handlers
        var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal Principal(Guid tenantId, TenantMembershipRole membershipRole)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(JwtTokenService.TenantIdClaimType, tenantId.ToString()),
            new(JwtTokenService.MembershipRoleClaimType, membershipRole.ToString()),
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));
    }
}
