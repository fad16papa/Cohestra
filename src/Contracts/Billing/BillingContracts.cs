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

public sealed record SyncBillingRequest(string? CheckoutSessionId);

public sealed record PortalSessionResponse(string PortalUrl);

public sealed record BillingContactResponse(string Name, string Email, string? Phone);

public sealed record BillingPaymentMethodResponse(
    string Id,
    string Brand,
    string Last4,
    int ExpMonth,
    int ExpYear);

public sealed record BillingSubscriptionDetailsResponse(
    bool CancelAtPeriodEnd,
    DateTimeOffset? CurrentPeriodEnd,
    string? ScheduledPlan,
    DateTimeOffset? ScheduledPlanEffectiveAt);

public sealed record BillingInvoiceResponse(
    string Id,
    DateTimeOffset CreatedAt,
    long AmountDueCents,
    string Currency,
    string Status,
    string? PdfUrl,
    string? HostedInvoiceUrl);

public sealed record BillingDetailsResponse(
    BillingSummaryResponse Summary,
    BillingContactResponse? Contact,
    BillingPaymentMethodResponse? PaymentMethod,
    BillingSubscriptionDetailsResponse? Subscription,
    IReadOnlyList<BillingInvoiceResponse> Invoices);

public sealed record SetupIntentResponse(string ClientSecret, string PublishableKey);

public sealed record ConfirmSetupIntentRequest(string SetupIntentId);

public sealed record UpdateBillingContactRequest(
    string? Name,
    string? Email,
    string? PhoneCountry,
    string? PhoneLocal);
