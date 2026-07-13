using System.Security.Cryptography;
using System.Text;
using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Site;

public sealed class SitePreviewTokenService(
    IOptions<JwtSettings> jwtSettings,
    IOptions<SitePreviewSettings> previewSettings)
{
    private const string TokenPurpose = "site-preview-v1";

    public SitePreviewTokenResult CreateToken(Guid userId)
    {
        var lifetimeMinutes = previewSettings.Value.TokenLifetimeMinutes;
        var expiresAt = lifetimeMinutes <= 0
            ? DateTimeOffset.UtcNow.AddSeconds(-30)
            : DateTimeOffset.UtcNow.AddMinutes(lifetimeMinutes);

        var payload = $"{TokenPurpose}|{userId:N}|{expiresAt.ToUnixTimeSeconds()}";
        var signature = ComputeSignature(payload);

        return new SitePreviewTokenResult(
            EncodeToken($"{payload}|{signature}"),
            expiresAt);
    }

    public bool TryValidate(string? token, out Guid userId)
    {
        userId = Guid.Empty;

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
        if (parts.Length != 3 ||
            !string.Equals(parts[0], TokenPurpose, StringComparison.Ordinal) ||
            !Guid.TryParseExact(parts[1], "N", out userId) ||
            !long.TryParse(parts[2], out var expiresUnix))
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
