using System.Net;
using Ganss.Xss;

namespace Cohestra.Infrastructure.Registrations;

internal static class HiddenValueSanitizer
{
    public const int MaxLength = 200;

    private static readonly HtmlSanitizer Sanitizer = Create();

    private static HtmlSanitizer Create()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedCssProperties.Clear();
        sanitizer.AllowedSchemes.Clear();
        sanitizer.KeepChildNodes = true;
        return sanitizer;
    }

    public static string Sanitize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        return WebUtility.HtmlDecode(Sanitizer.Sanitize(raw)).Trim();
    }
}
