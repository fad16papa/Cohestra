using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;

using Cohestra.Domain.Tenants;
namespace Cohestra.Domain.Registrations;

public class Registration : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string RegistrationNumber { get; set; } = string.Empty;

    public Guid ActivityId { get; set; }

    public Activity Activity { get; set; } = null!;

    public Guid ClientId { get; set; }

    public Client Client { get; set; } = null!;

    public Dictionary<string, object?> Answers { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
}
