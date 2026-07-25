using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Cohestra.Infrastructure.Auth;

public interface IJwtTokenService
{
    (string AccessToken, int ExpiresInSeconds) CreateAccessToken(
        ApplicationUser user,
        IList<string> roles,
        Guid? tenantId = null,
        TenantMembershipRole? membershipRole = null);
}

public sealed class JwtTokenService(IOptions<JwtSettings> options) : IJwtTokenService
{
    public const string TenantIdClaimType = "tenant_id";
    public const string MembershipRoleClaimType = "role";
    public const string PlatformAdminClaimType = "platform_admin";
    public const string PlatformAdminClaimValue = "true";

    public (string AccessToken, int ExpiresInSeconds) CreateAccessToken(
        ApplicationUser user,
        IList<string> roles,
        Guid? tenantId = null,
        TenantMembershipRole? membershipRole = null)
    {
        var settings = options.Value;
        var expiresInSeconds = settings.AccessTokenMinutes * 60;
        var expiresAt = DateTime.UtcNow.AddSeconds(expiresInSeconds);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Spine: platform_admin=true only for PlatformOnly sessions (no tenant bind).
        // Fail-closed if TenantAdmin Identity is present or tenant claims are supplied.
        var isPlatformAdmin = roles.Contains(PlatformAdminSeeder.PlatformAdminRole, StringComparer.Ordinal);
        var isTenantAdmin = roles.Contains(OperatorSeeder.TenantAdminRole, StringComparer.Ordinal);
        if (isPlatformAdmin && !isTenantAdmin && tenantId is null && membershipRole is null)
        {
            claims.Add(new Claim(PlatformAdminClaimType, PlatformAdminClaimValue));
        }

        if (tenantId is not null)
        {
            claims.Add(new Claim(TenantIdClaimType, tenantId.Value.ToString()));
        }

        if (membershipRole is not null)
        {
            claims.Add(new Claim(MembershipRoleClaimType, membershipRole.Value.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresInSeconds);
    }
}
