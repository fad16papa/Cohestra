using Cohestra.Domain.Billing;

namespace Cohestra.Domain.Tenants;

public sealed class Tenant
{
    public Guid Id { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Contact email captured at provision (membership/invite lands Epic 12).</summary>
    public string? AdminContactEmail { get; set; }

    public TenantPlan Plan { get; set; } = TenantPlan.Basic;

    public TenantStatus Status { get; set; } = TenantStatus.Active;

    public BillingStatus BillingStatus { get; set; } = BillingStatus.Free;

    /// <summary>
    /// P12 / FR-2: Platform Admin complimentary (Sponsored) plan — no Stripe required, BillingStatus=Free.
    /// FR-23 delinquency jobs MUST skip when true. FR-25 dormancy does not apply to complimentary Core/Pro.
    /// </summary>
    public bool IsComplimentary { get; set; }

    public string? StripeCustomerId { get; set; }

    public string? StripeSubscriptionId { get; set; }

    public BillingInterval? BillingInterval { get; set; }

    public DateTimeOffset? TrialEndsAt { get; set; }

    public DateTimeOffset? DelinquencyStartedAt { get; set; }

    public DateTimeOffset? SuspendedAt { get; set; }

    /// <summary>Soft-archive timestamp (NFR-8 / A-6: 30-day window before purge job — purge out of scope).</summary>
    public DateTimeOffset? ArchivedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
