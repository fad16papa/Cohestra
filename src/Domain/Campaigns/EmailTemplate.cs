namespace Cohestra.Domain.Campaigns;

public class EmailTemplate
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public CampaignBodyFormat BodyFormat { get; set; } = CampaignBodyFormat.Plain;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
