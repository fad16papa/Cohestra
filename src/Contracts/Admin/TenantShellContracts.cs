namespace Cohestra.Contracts.Admin;

public sealed record TenantShellResponse(
    string Plan,
    string BillingStatus,
    string? BillingInterval,
    DateTimeOffset? TrialEndsAt,
    bool IsComplimentary,
    bool IsTenantAdmin,
    bool IsBillingOwner,
    string? BillingOwnerEmail,
    string TenantSlug,
    string? TenantName,
    string RegistrationTimeZoneId,
    DateTimeOffset RegistrationMonthResetsAt,
    PlanLimitsResponse Limits,
    PlanUsageResponse Usage,
    IReadOnlyList<LimitDialResponse> LimitDials,
    BillingBannerResponse? BillingBanner);

public sealed record PlanLimitsResponse(
    int Seats,
    int Communities,
    int PublishedActivities,
    int RegistrationsPerMonth);

public sealed record PlanUsageResponse(
    int SeatsUsed,
    int Communities,
    int PublishedActivities,
    int RegistrationsThisMonth);

public sealed record LimitDialResponse(
    string Key,
    string Label,
    int Used,
    int Limit,
    int Percent,
    bool Warn,
    bool Blocked,
    string? Hint);

public sealed record BillingBannerResponse(
    string Variant,
    string Title,
    string Message,
    string? CtaLabel,
    string? CtaHref,
    bool AdminOnlyCta);
