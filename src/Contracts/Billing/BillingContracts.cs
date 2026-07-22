namespace Cohestra.Contracts.Billing;

public sealed record BillingSummaryResponse(
    string Plan,
    string BillingStatus,
    string? BillingInterval,
    DateTimeOffset? TrialEndsAt,
    bool HasConsumedTrial,
    bool StripeConfigured,
    string? PublishableKey,
    int TrialPeriodDays,
    bool IsComplimentary);

public sealed record CreateCheckoutSessionRequest(
    string Plan,
    string Interval,
    string? SuccessUrl,
    string? CancelUrl);

public sealed record CheckoutSessionResponse(
    string CheckoutUrl,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    string TrialDisclaimer);

public sealed record CreatePortalSessionRequest(string? ReturnUrl);

public sealed record PortalSessionResponse(string PortalUrl);
