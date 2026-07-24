using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Site;

public sealed class SiteHomepageTemplate : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<SiteSection> Sections { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
