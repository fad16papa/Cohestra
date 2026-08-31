using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Activities;

public sealed class TenantFormTemplate : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public ActivityFormSchema FormSchema { get; set; } = new();

    public string? PinnedRegistrationThemePreset { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
