using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Activities;

public class Community : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? LogoAssetId { get; set; }

    public string? AccentColor { get; set; }

    public string? DefaultHeroImageUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
