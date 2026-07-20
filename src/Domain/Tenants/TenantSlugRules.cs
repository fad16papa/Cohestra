using System.Text.RegularExpressions;

namespace Cohestra.Domain.Tenants;

/// <summary>
/// P10 slug rules for tenant provision / signup (FR-1 / FR-2).
/// </summary>
public static partial class TenantSlugRules
{
    public const int MinLength = 3;
    public const int MaxLength = 48;

    /// <summary>Reserved host labels — also blocks creating a second <c>default</c> tenant.</summary>
    public static readonly HashSet<string> Reserved = new(StringComparer.Ordinal)
    {
        "www",
        "api",
        "admin",
        "app",
        "platform",
        "mail",
        "ftp",
        "cdn",
        "static",
        "status",
        "support",
        "help",
        "billing",
        "cohestra",
        TenantIds.DefaultSlug,
    };

    public static bool IsValidFormat(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return false;
        }

        var value = slug.Trim();
        if (value.Length is < MinLength or > MaxLength)
        {
            return false;
        }

        return SlugPattern().IsMatch(value);
    }

    public static bool IsReserved(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return false;
        }

        return Reserved.Contains(slug.Trim());
    }

    /// <summary>Normalize for storage: trim + lowercase.</summary>
    public static string Normalize(string slug) => slug.Trim().ToLowerInvariant();

    public static string? ValidateForProvision(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return "Slug is required.";
        }

        var normalized = Normalize(slug);
        if (!IsValidFormat(normalized))
        {
            return "Slug must be 3–48 characters, lowercase [a-z0-9-], starting and ending with alphanumeric.";
        }

        if (IsReserved(normalized))
        {
            return $"Slug '{normalized}' is reserved.";
        }

        return null;
    }

    [GeneratedRegex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", RegexOptions.CultureInvariant)]
    private static partial Regex SlugPattern();
}
