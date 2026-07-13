namespace LeadGenerationCrm.Domain.Clients;

public class ClientTimelineEvent
{
    public Guid Id { get; set; }

    public Guid ClientId { get; set; }

    public Client Client { get; set; } = null!;

    public ClientTimelineEventType EventType { get; set; }

    public DateTimeOffset OccurredAt { get; set; }

    public string? PreviousLeadStatus { get; set; }

    public string? NewLeadStatus { get; set; }

    public string? Subject { get; set; }

    public string? Note { get; set; }

    public Guid? CampaignId { get; set; }
}
