namespace Cohestra.Infrastructure.Seed;

public sealed class SiteLandingSeedSettings
{
    public const string SectionName = "SiteLanding";

    public string SiteName { get; set; } = "Cohestra";

    public string Tagline { get; set; } = "Community events. Meaningful connections.";

    public string Description { get; set; } =
        "Discover events, register in seconds, and stay connected with the communities you care about.";

    public string Eyebrow { get; set; } = "Community events platform";

    public string OperatorCtaLabel { get; set; } = "Operator sign in";

    public string PoweredByLabel { get; set; } = "Cohestra";

    public string? AccentColor { get; set; } = "#2563eb";
}
