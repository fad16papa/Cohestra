using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;

namespace Cohestra.Domain.Registrations;

public class Registration
{
    public Guid Id { get; set; }

    public string RegistrationNumber { get; set; } = string.Empty;

    public Guid ActivityId { get; set; }

    public Activity Activity { get; set; } = null!;

    public Guid ClientId { get; set; }

    public Client Client { get; set; } = null!;

    public Dictionary<string, object?> Answers { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
}
