using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class JwtTokenServiceTests
{
    private static JwtTokenService CreateService() =>
        new(Options.Create(new JwtSettings
        {
            Issuer = "cohestra",
            Audience = "cohestra-api",
            SigningKey = "unit-test-signing-key-at-least-32-chars!",
            AccessTokenMinutes = 15,
        }));

    [Fact]
    public void CreateAccessToken_includes_tenant_id_and_membership_role()
    {
        var service = CreateService();
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = "admin@test.local",
        };

        var (token, _) = service.CreateAccessToken(
            user,
            ["TenantAdmin"],
            TenantIds.Default,
            TenantMembershipRole.TenantAdmin);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal(TenantIds.Default.ToString(), jwt.Claims.First(c => c.Type == JwtTokenService.TenantIdClaimType).Value);
        Assert.Equal("TenantAdmin", jwt.Claims.First(c => c.Type == JwtTokenService.MembershipRoleClaimType).Value);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == JwtTokenService.PlatformAdminClaimType);
        Assert.Equal(user.Id.ToString(), jwt.Subject);
    }

    [Fact]
    public void CreateAccessToken_platform_session_emits_platform_admin_claim()
    {
        var service = CreateService();
        var user = new ApplicationUser { Id = Guid.NewGuid(), Email = "pa@test.local" };
        var (token, _) = service.CreateAccessToken(user, [PlatformAdminSeeder.PlatformAdminRole]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == JwtTokenService.TenantIdClaimType);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == JwtTokenService.MembershipRoleClaimType);
        Assert.Equal(
            JwtTokenService.PlatformAdminClaimValue,
            jwt.Claims.First(c => c.Type == JwtTokenService.PlatformAdminClaimType).Value);
        Assert.Contains(
            jwt.Claims,
            c => c.Type == ClaimTypes.Role && c.Value == PlatformAdminSeeder.PlatformAdminRole);
    }

    [Fact]
    public void CreateAccessToken_omits_platform_admin_when_TenantAdmin_Identity_present()
    {
        var service = CreateService();
        var user = new ApplicationUser { Id = Guid.NewGuid(), Email = "mixed@test.local" };
        var (token, _) = service.CreateAccessToken(
            user,
            [PlatformAdminSeeder.PlatformAdminRole, OperatorSeeder.TenantAdminRole],
            TenantIds.Default,
            TenantMembershipRole.TenantAdmin);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == JwtTokenService.PlatformAdminClaimType);
    }
}
