using System.Text.RegularExpressions;

namespace Cohestra.Infrastructure.Platform;

public static partial class PlatformHealthDescriptionSanitizer
{
    public const int MaxLength = 200;

    public static string? Sanitize(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        var text = description.Trim();
        text = CredentialPair().Replace(text, "$1=***");
        text = RedisUrl().Replace(text, "redis://***");
        text = SecretToken().Replace(text, "***");
        if (text.Length > MaxLength)
        {
            text = text[..MaxLength];
        }

        return text;
    }

    [GeneratedRegex(@"(?i)\b(password|pwd|username|user id|userid|host|server|port)\s*=\s*[^;\s]+")]
    private static partial Regex CredentialPair();

    [GeneratedRegex(@"(?i)rediss?://[^\s]+")]
    private static partial Regex RedisUrl();

    [GeneratedRegex(@"(?i)\b(bearer|apikey|api[_-]?key|secret)\s*[:=]\s*\S+")]
    private static partial Regex SecretToken();
}
