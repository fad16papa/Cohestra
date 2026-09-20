namespace Cohestra.Domain.Activities;

public static class RegistrationTypographyScales
{
    public const string Compact = "compact";
    public const string Default = "default";
    public const string Spacious = "spacious";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Compact,
        Default,
        Spacious,
    };
}

public static class RegistrationFieldSizes
{
    public const string Default = "default";
    public const string Comfortable = "comfortable";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Default,
        Comfortable,
    };
}

public static class RegistrationFieldRadii
{
    public const string Sm = "sm";
    public const string Md = "md";
    public const string Lg = "lg";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Sm,
        Md,
        Lg,
    };
}

public static class RegistrationButtonWidths
{
    public const string Auto = "auto";
    public const string Full = "full";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Auto,
        Full,
    };
}

public static class RegistrationSurfaceEmphases
{
    public const string Flat = "flat";
    public const string Soft = "soft";
    public const string Elevated = "elevated";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Flat,
        Soft,
        Elevated,
    };
}

public sealed class RegistrationDesignTokens
{
    public string? TypographyScale { get; set; }

    public string? FieldSize { get; set; }

    public string? FieldRadius { get; set; }

    public string? ButtonWidth { get; set; }

    public string? SurfaceEmphasis { get; set; }
}

public sealed class ResolvedRegistrationDesignTokens
{
    public required string TypographyScale { get; init; }

    public required string FieldSize { get; init; }

    public required string FieldRadius { get; init; }

    public required string ButtonWidth { get; init; }

    public required string SurfaceEmphasis { get; init; }
}
