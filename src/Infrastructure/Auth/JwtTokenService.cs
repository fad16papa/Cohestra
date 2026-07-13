using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LeadGenerationCrm.Infrastructure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LeadGenerationCrm.Infrastructure.Auth;

public interface IJwtTokenService
{
    (string AccessToken, int ExpiresInSeconds) CreateAccessToken(ApplicationUser user, IList<string> roles);
}

public sealed class JwtTokenService(IOptions<JwtSettings> options) : IJwtTokenService
{
    public (string AccessToken, int ExpiresInSeconds) CreateAccessToken(ApplicationUser user, IList<string> roles)
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
