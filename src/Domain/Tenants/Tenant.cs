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
    /// P12 / FR-2: Platform Admin complimentary (Sponsored) plan — no Paddle required, BillingStatus=Free.
    /// FR-23 delinquency jobs MUST skip when true. FR-25 dormancy does not apply to complimentary Core/Pro.
    /// </summary>
    public bool IsComplimentary { get; set; } = false;

    public string? PaddleCustomerId { get; set; }

    public string? PaddleSubscriptionId { get; set; }

    public BillingInterval? BillingInterval { get; set; }

    public DateTimeOffset? TrialEndsAt { get; set; }

    /// <summary>FR-19: set when a tenant consumes its one-time Core/Pro trial.</summary>
    public bool HasConsumedTrial { get; set; } = false;

    public DateTimeOffset? DelinquencyStartedAt { get; set; }

    public DateTimeOffset? SuspendedAt { get; set; }

    /// <summary>Soft-archive timestamp (NFR-8 / A-6: 30-day window before purge job — purge out of scope).</summary>
    public DateTimeOffset? ArchivedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>FR-26a: when the tenant admin accepted ToS + Privacy at self-serve signup.</summary>
    public DateTimeOffset? LegalAcceptedAt { get; set; }

    /// <summary>FR-26a: version string of Terms accepted (e.g. 2026-07-21).</summary>
    public string? TermsVersion { get; set; }

    /// <summary>FR-26a: version string of Privacy Policy accepted.</summary>
    public string? PrivacyVersion { get; set; }

    /// <summary>FR-24: plan scheduled to apply at period end (cancel/downgrade).</summary>
    public TenantPlan? ScheduledPlan { get; set; }

    public DateTimeOffset? ScheduledPlanEffectiveAt { get; set; }

    /// <summary>Billing interval to apply when <see cref="ScheduledPlan"/> takes effect.</summary>
    public BillingInterval? ScheduledBillingInterval { get; set; }

    /// <summary>Paddle scheduled change id controlling a pending downgrade.</summary>
    public string? PaddleSubscriptionScheduleId { get; set; }

    /// <summary>FR-25: max(last admin/member login, last public registration) for dormancy.</summary>
    public DateTimeOffset? LastActivityAt { get; set; }

    public DateTimeOffset? LastTrialReminderSentAt { get; set; }

    public DateTimeOffset? LastPastDueNoticeAt { get; set; }

    public DateTimeOffset? LastOnHoldNoticeAt { get; set; }

    public DateTimeOffset? LastDormancyWarningAt { get; set; }

    /// <summary>
    /// IANA timezone for monthly public registration limit windows (FR-27 Option C).
    /// Default UTC. Server-owned — not client-supplied per request.
    /// </summary>
    public string RegistrationTimeZoneId { get; set; } = RegistrationTimeZoneDefaults.Utc;

    /// <summary>When true (default), enqueue operator email on each new public registration.</summary>
    public bool EmailOnNewRegistration { get; set; } = true;

    /// <summary>Enterprise custom domain hostname (e.g. events.example.com).</summary>
    public string? CustomDomain { get; set; }

    /// <summary>Set when DNS verification succeeds for <see cref="CustomDomain"/>.</summary>
    public DateTimeOffset? CustomDomainVerifiedAt { get; set; }

    /// <summary>
    /// Origins allowed to iframe public embed routes (e.g. https://www.notion.so).
    /// Empty list keeps frame-ancestors 'none'.
    /// </summary>
    public List<string> AllowedEmbedOrigins { get; set; } = [];
}
