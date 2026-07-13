namespace LeadGenerationCrm.Contracts.Site;

public sealed record SiteHomepageTemplateSummaryDto(
    string Id,
    string Name,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int SectionCount);

public sealed record CreateSiteHomepageTemplateRequest(string Name);
