using System.Text.Json;

namespace LeadGenerationCrm.Domain.Site;

public sealed class SiteSectionsDocument
{
    public int SchemaVersion { get; set; } = 1;

    public string SiteName { get; set; } = string.Empty;

    public string? AccentColor { get; set; }

    public string? LogoAssetId { get; set; }

    public string? PresetId { get; set; }

    public List<SiteSection> Sections { get; set; } = [];
}

public sealed class SiteSection
{
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Section type (schema v1): hero, highlights, upcomingActivities, howItWorks, footer.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    public bool Enabled { get; set; }

    public int Order { get; set; }

    public JsonElement Props { get; set; }
}
