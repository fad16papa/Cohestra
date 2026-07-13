namespace LeadGenerationCrm.Domain.Site;

public sealed class SiteHomepageTemplate
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<SiteSection> Sections { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
