using System.Text.RegularExpressions;

namespace LeadGenerationCrm.Infrastructure.Branding;

public static partial class BrandAccentValidator
{
    [GeneratedRegex("^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$", RegexOptions.CultureInvariant)]
    private static partial Regex AccentColorPattern();

    public static string? Normalize(string? accentColor)
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

    public static string? Validate(string? accentColor)
    {
        if (string.IsNullOrWhiteSpace(accentColor))
        {
            return null;
        }

        if (!AccentColorPattern().IsMatch(accentColor.Trim()))
        {
            return "Brand accent must be a hex value like #2d6a4f.";
        }

        return null;
    }
}
