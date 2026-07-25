using System.Security.Cryptography;
using System.Text;
using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Site;

public sealed class SitePreviewTokenService(
    IOptions<JwtSettings> jwtSettings,
    IOptions<SitePreviewSettings> previewSettings)
{
    /// <summary>v2 binds preview tokens to a tenant so Host-scoped draft load cannot cross tenants.</summary>
    private const string TokenPurpose = "site-preview-v2";

    public SitePreviewTokenResult CreateToken(Guid userId, Guid tenantId)
    {
        if (tenantId == Guid.Empty)
        {
            throw new ArgumentException("Tenant id is required for site preview tokens.", nameof(tenantId));
        }

        var lifetimeMinutes = previewSettings.Value.TokenLifetimeMinutes;
        var expiresAt = lifetimeMinutes <= 0
            ? DateTimeOffset.UtcNow.AddSeconds(-30)
            : DateTimeOffset.UtcNow.AddMinutes(lifetimeMinutes);

        var payload = $"{TokenPurpose}|{userId:N}|{tenantId:N}|{expiresAt.ToUnixTimeSeconds()}";
        var signature = ComputeSignature(payload);

        return new SitePreviewTokenResult(
            EncodeToken($"{payload}|{signature}"),
            expiresAt);
    }

    public bool TryValidate(string? token, out Guid userId, out Guid tenantId)
    {
        userId = Guid.Empty;
        tenantId = Guid.Empty;

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(Base64UrlDecode(token.Trim()));
        }
        catch (FormatException)
        {
            return false;
        }

        var lastSeparator = decoded.LastIndexOf('|');
        if (lastSeparator <= 0)
        {
            return false;
        }

        var payload = decoded[..lastSeparator];
        var signature = decoded[(lastSeparator + 1)..];

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(ComputeSignature(payload)),
                Encoding.UTF8.GetBytes(signature)))
        {
            return false;
        }

        var parts = payload.Split('|');
        if (parts.Length != 4 ||
            !string.Equals(parts[0], TokenPurpose, StringComparison.Ordinal) ||
            !Guid.TryParseExact(parts[1], "N", out userId) ||
            !Guid.TryParseExact(parts[2], "N", out tenantId) ||
            tenantId == Guid.Empty ||
            !long.TryParse(parts[3], out var expiresUnix))
        {
            return false;
        }

        var expiresAt = DateTimeOffset.FromUnixTimeSeconds(expiresUnix);
        return expiresAt > DateTimeOffset.UtcNow;
    }

    private string ComputeSignature(string payload)
    {
        var key = Encoding.UTF8.GetBytes(jwtSettings.Value.SigningKey);
        using var hmac = new HMACSHA256(key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash);
    }

    private static string EncodeToken(string value) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(value))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2:
                padded += "==";
                break;
            case 3:
                padded += "=";
                break;
        }

        return Convert.FromBase64String(padded);
    }
}

public sealed record SitePreviewTokenResult(string Token, DateTimeOffset ExpiresAt);
