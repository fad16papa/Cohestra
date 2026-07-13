using System.Text.RegularExpressions;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static partial class ActivityBrandingValidator
{
    [GeneratedRegex("^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$", RegexOptions.CultureInvariant)]
    private static partial Regex AccentColorPattern();

    public static string? NormalizeHeroImageUrl(string? heroImageUrl)
    {
        if (string.IsNullOrWhiteSpace(heroImageUrl))
        {
            return null;
        }

        return heroImageUrl.Trim();
    }

    public static string? NormalizeAccentColor(string? accentColor)
    {
        if (string.IsNullOrWhiteSpace(accentColor))
        {
            return null;
        }

        var trimmed = accentColor.Trim();
        if (!AccentColorPattern().IsMatch(trimmed))
        {
            return trimmed;
        }

        if (trimmed.Length == 4)
        {
            return $"#{trimmed[1]}{trimmed[1]}{trimmed[2]}{trimmed[2]}{trimmed[3]}{trimmed[3]}".ToLowerInvariant();
        }

        return trimmed.ToLowerInvariant();
    }

    public static string? ValidateHeroImageUrl(string? heroImageUrl)
    {
        var normalized = NormalizeHeroImageUrl(heroImageUrl);
        if (normalized is null)
        {
            return null;
        }

        if (normalized.Length > 2048)
        {
            return "Hero image URL must be 2048 characters or fewer.";
        }

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            uri.Scheme is not "http" and not "https")
        {
            return "Hero image URL must be a valid http or https URL.";
        }

        return null;
    }

    public static string? ValidateAccentColor(string? accentColor)
    {
        if (string.IsNullOrWhiteSpace(accentColor))
        {
            return null;
        }

        if (!AccentColorPattern().IsMatch(accentColor.Trim()))
        {
            return "Accent color must be a hex value like #2d6a4f.";
        }

        return null;
    }
}
