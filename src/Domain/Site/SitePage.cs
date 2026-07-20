using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Site;

public sealed class SitePage : ITenantScoped
{
    /// <summary>
    /// Legacy row Id retained for the default tenant only (Platform 0 continuity).
    /// Prefer lookups by <see cref="TenantId"/>; do not treat this as a global singleton key.
    /// </summary>
    public static readonly Guid SingletonId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public SiteSectionsDocument? DraftSections { get; set; }

    public SiteSectionsDocument? PublishedSections { get; set; }

    public SiteSectionsDocument? PreviousPublishedSections { get; set; }

    public DateTimeOffset? PreviousPublishedAt { get; set; }

    public DateTimeOffset DraftUpdatedAt { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public Guid? PublishedByUserId { get; set; }

    public int SchemaVersion { get; set; } = 1;
}
