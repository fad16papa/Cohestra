namespace Cohestra.Domain.Activities;

public class Activity
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Schedule { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string CommunityLabel { get; set; } = string.Empty;

    public string? HeroImageUrl { get; set; }

    public string? AccentColor { get; set; }

    public ActivityStatus Status { get; set; } = ActivityStatus.Draft;

    public ActivityFormSchema? FormSchema { get; set; }

    public bool ShowOnHomepage { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
