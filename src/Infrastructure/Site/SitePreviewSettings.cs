namespace LeadGenerationCrm.Infrastructure.Site;

public sealed class SitePreviewSettings
{
    public const string SectionName = "SitePreview";

    public int TokenLifetimeMinutes { get; set; } = 60;
}
