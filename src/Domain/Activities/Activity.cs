using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Activities;

public class Activity : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Schedule { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string CommunityLabel { get; set; } = string.Empty;

    public string? HeroImageUrl { get; set; }

    public string? AccentColor { get; set; }

    public RegistrationTheme? RegistrationTheme { get; set; }

    public ActivityStatus Status { get; set; } = ActivityStatus.Draft;

    public ActivityFormSchema? FormSchema { get; set; }

    public bool ShowOnHomepage { get; set; } = true;

    /// <summary>When set, public registration closes after this many registrations. Null = unlimited.</summary>
    public int? MaxRegistrants { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
