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
        text = CredentialPair().Replace(text, "[redacted]");
        text = RedisUrl().Replace(text, "[redacted]");
        text = SecretToken().Replace(text, "[redacted]");
        text = JwtToken().Replace(text, "[redacted]");
        text = EmailAddress().Replace(text, "[redacted]");
        text = StackFrame().Replace(text, string.Empty);
        text = Regex.Replace(text, @"[ \t]+\n", "\n").Trim();
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

    [GeneratedRegex(@"(?i)\b(bearer|apikey|api[_-]?key|secret)(?:\s*[:=]\s*|\s+)\S+")]
    private static partial Regex SecretToken();

    [GeneratedRegex(@"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")]
    private static partial Regex JwtToken();

    [GeneratedRegex(@"(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b")]
    private static partial Regex EmailAddress();

    [GeneratedRegex(@"(?m)^\s*at\s+.+$")]
    private static partial Regex StackFrame();
}
