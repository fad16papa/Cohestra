namespace Cohestra.Infrastructure.Seed;

public sealed class SiteLandingSeedSettings
{
    public const string SectionName = "SiteLanding";

    public string SiteName { get; set; } = "The Social Collective";

    public string Tagline { get; set; } = "Community activities. Meaningful connections.";

    public string Description { get; set; } =
        "Join our events, register in seconds, and stay connected with the communities you care about.";

    public string Eyebrow { get; set; } = "Singapore · Community events";

    public string OperatorCtaLabel { get; set; } = "Operator sign in";

    public string PoweredByLabel { get; set; } = "Powered by CreativoRare";

    public string? AccentColor { get; set; } = "#c45c26";
}
