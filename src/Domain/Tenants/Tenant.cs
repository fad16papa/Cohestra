using Cohestra.Domain.Billing;

namespace Cohestra.Domain.Tenants;

public sealed class Tenant
{
    public Guid Id { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public TenantPlan Plan { get; set; } = TenantPlan.Basic;

    public TenantStatus Status { get; set; } = TenantStatus.Active;

    public BillingStatus BillingStatus { get; set; } = BillingStatus.Free;

    public string? StripeCustomerId { get; set; }

    public string? StripeSubscriptionId { get; set; }

    public BillingInterval? BillingInterval { get; set; }

    public DateTimeOffset? TrialEndsAt { get; set; }

    public DateTimeOffset? DelinquencyStartedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
