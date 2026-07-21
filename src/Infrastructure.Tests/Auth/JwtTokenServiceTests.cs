using System.IdentityModel.Tokens.Jwt;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class JwtTokenServiceTests
{
    [Fact]
    public void CreateAccessToken_includes_tenant_id_and_membership_role()
    {
        var service = new JwtTokenService(Options.Create(new JwtSettings
        {
            Issuer = "cohestra",
            Audience = "cohestra-api",
            SigningKey = "unit-test-signing-key-at-least-32-chars!",
            AccessTokenMinutes = 15,
        }));

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
        Assert.Contains(jwt.Claims, c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase) || c.Type.Contains("role", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(user.Id.ToString(), jwt.Subject);
    }

    [Fact]
    public void CreateAccessToken_omits_tenant_claims_for_platform_session()
    {
        var service = new JwtTokenService(Options.Create(new JwtSettings
        {
            Issuer = "cohestra",
            Audience = "cohestra-api",
            SigningKey = "unit-test-signing-key-at-least-32-chars!",
            AccessTokenMinutes = 15,
        }));

        var user = new ApplicationUser { Id = Guid.NewGuid(), Email = "pa@test.local" };
        var (token, _) = service.CreateAccessToken(user, ["PlatformAdmin"]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == JwtTokenService.TenantIdClaimType);
    }
}
