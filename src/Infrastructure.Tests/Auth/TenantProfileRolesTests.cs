using System.Security.Claims;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class TenantProfileRolesTests
{
    [Fact]
    public void Membership_only_member_surfaces_TenantMember()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(JwtTokenService.TenantIdClaimType, TenantIds.Default.ToString()),
            new Claim(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantMember.ToString()),
        ], "Bearer"));

        var roles = TenantProfileRoles.FromPrincipal(user);

        Assert.Equal(["TenantMember"], roles);
    }

    [Fact]
    public void Prefers_membership_over_identity_TenantAdmin()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, OperatorSeeder.TenantAdminRole),
            new Claim(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantMember.ToString()),
        ], "Bearer"));

        var roles = TenantProfileRoles.FromPrincipal(user);

        Assert.Equal(["TenantMember"], roles);
        Assert.DoesNotContain(OperatorSeeder.TenantAdminRole, roles);
    }

    [Fact]
    public void Keeps_Identity_PlatformAdmin_with_membership()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Role, PlatformAdminSeeder.PlatformAdminRole),
            new Claim(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantAdmin.ToString()),
        ], "Bearer"));

        var roles = TenantProfileRoles.FromPrincipal(user);

        Assert.Contains(TenantMembershipRole.TenantAdmin.ToString(), roles);
        Assert.Contains(PlatformAdminSeeder.PlatformAdminRole, roles);
    }

    [Fact]
    public void Falls_back_to_identity_roles_without_membership_claim()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Role, PlatformAdminSeeder.PlatformAdminRole),
        ], "Bearer"));

        var roles = TenantProfileRoles.FromPrincipal(user);

        Assert.Equal([PlatformAdminSeeder.PlatformAdminRole], roles);
    }
}
