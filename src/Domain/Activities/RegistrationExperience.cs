namespace Cohestra.Domain.Activities;

public static class RegistrationExperienceLayouts
{
    public const string Centered = "centered";
    public const string Split = "split";
    public const string Poster = "poster";
    public const string Immersive = "immersive";
    public const string Card = "card";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Centered,
        Split,
        Poster,
        Immersive,
        Card,
    };
}

public static class RegistrationExperienceStyles
{
    public const string Modern = "modern";
    public const string Minimal = "minimal";
    public const string Editorial = "editorial";
    public const string Bold = "bold";
    public const string Soft = "soft";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Modern,
        Minimal,
        Editorial,
        Bold,
        Soft,
    };
}

public static class RegistrationExperienceFlows
{
    public const string SinglePage = "single-page";
    public const string Sections = "sections";
    public const string StepByStep = "step-by-step";
    public const string Conversational = "conversational";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        SinglePage,
        Sections,
        StepByStep,
        Conversational,
    };
}

public static class RegistrationExperienceHeroDisplays
{
    public const string Cover = "cover";
    public const string Contain = "contain";
    public const string FullBleed = "full-bleed";
    public const string Split = "split";
    public const string Background = "background";
    public const string Hidden = "hidden";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Cover,
        Contain,
        FullBleed,
        Split,
        Background,
        Hidden,
    };
}

public sealed class RegistrationExperience
{
    public string? Layout { get; set; }

    public string? Style { get; set; }

    public string? Flow { get; set; }

    public string? HeroDisplay { get; set; }
}

public sealed class ResolvedRegistrationExperience
{
    public required string Layout { get; init; }

    public required string Style { get; init; }

    public required string Flow { get; init; }

    public required string HeroDisplay { get; init; }
}
