namespace Cohestra.Domain.Clients;

public class Client
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? NormalizedPhone { get; set; }

    public string? Email { get; set; }

    public string? NormalizedEmail { get; set; }

    public string? Profession { get; set; }

    public string? Nationality { get; set; }

    public string? Residency { get; set; }

    public bool ConsentGiven { get; set; }

    public string? ReferralSource { get; set; }

    public LeadStatus LeadStatus { get; set; } = LeadStatus.New;

    public bool IsMergeSuspect { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Registrations.Registration> Registrations { get; set; } = [];

    public ICollection<ClientTimelineEvent> TimelineEvents { get; set; } = [];
}
