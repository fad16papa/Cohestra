using System.Text.Json;

namespace LeadGenerationCrm.Contracts.Site;

/// <summary>
/// Site Page JSON document (schema version 1). Section <c>type</c> values:
/// hero, highlights, upcomingActivities, howItWorks, footer.
/// Hero CTA targets: scroll-upcoming, /login, activity:{slug}.
/// </summary>
public sealed record SiteSectionsDocumentDto(
    int SchemaVersion,
    string SiteName,
    string? AccentColor,
    string? LogoAssetId,
    string? PresetId,
    IReadOnlyList<SiteSectionDto> Sections);

public sealed record SiteSectionDto(
    string Id,
    string Type,
    bool Enabled,
    int Order,
    JsonElement Props);
