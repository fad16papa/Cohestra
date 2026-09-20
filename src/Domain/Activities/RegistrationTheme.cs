namespace Cohestra.Domain.Activities;

public static class RegistrationThemePresets
{
    public const string Classic = "classic";
    public const string Card = "card";
    public const string Immersive = "immersive";
    public const string Compact = "compact";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Classic,
        Card,
        Immersive,
        Compact,
    };
}

public sealed class RegistrationTheme
{
    public string Preset { get; set; } = RegistrationThemePresets.Classic;

    public bool InheritCommunityBrand { get; set; } = true;

    public string? AccentColor { get; set; }

    public string? HeroImageUrl { get; set; }

    /// <summary>Optional composable experience (layout/style/flow). Null → derive from <see cref="Preset"/>.</summary>
    public RegistrationExperience? Experience { get; set; }

    /// <summary>Bounded public design tokens (typography, fields, button, surface).</summary>
    public RegistrationDesignTokens? DesignTokens { get; set; }

    public static RegistrationTheme Default { get; } = new();
}
