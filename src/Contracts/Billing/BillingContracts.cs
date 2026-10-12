namespace Cohestra.Contracts.Billing;

public sealed record BillingUsageResponse(
    int SeatsUsed,
    int Communities,
    int PublishedActivities,
    int RegistrationsThisMonth);

public sealed record BillingPlanLimitsResponse(
    int Seats,
    int Communities,
    int PublishedActivities,
    int RegistrationsPerMonth);

public sealed record BillingSummaryResponse(
    string Plan,
    string BillingStatus,
    string? BillingInterval,
    DateTimeOffset? TrialEndsAt,
    bool HasConsumedTrial,
    bool BillingConfigured,
    string? ClientToken,
    int TrialPeriodDays,
    bool IsComplimentary,
    BillingUsageResponse? Usage = null,
    BillingPlanLimitsResponse? CoreLimits = null,
    BillingPlanLimitsResponse? ProLimits = null,
    string? ScheduledPlan = null,
    DateTimeOffset? ScheduledPlanEffectiveAt = null,
    string? ScheduledBillingInterval = null,
    bool CancelAtPeriodEnd = false);

public sealed record CreateCheckoutSessionRequest(
    string Plan,
    string Interval,
    string? SuccessUrl,
    string? CancelUrl);

public sealed record PreviewPlanChangeRequest(string Plan, string Interval);

public sealed record ConfirmPlanChangeRequest(
    string Plan,
    string Interval,
    string? PreviewState,
    string? SuccessUrl,
    string? CancelUrl);

public sealed record BillingMoneyResponse(long AmountMinor, string Currency);

public sealed record PreviewPlanChangeResponse(
    string CurrentPlan,
    string CurrentInterval,
    string TargetPlan,
    string TargetInterval,
    string? Currency,
    BillingMoneyResponse? Credit,
    BillingMoneyResponse? DueNow,
    BillingMoneyResponse? NextRecurringAmount,
    DateTimeOffset? NextBilledAt,
    bool ProviderPreviewAvailable,
    bool Deferred,
    string PreviewState,
    string ReviewCopy,
    string ConfirmLabel);

public sealed record ConfirmPlanChangeResponse(
    string SuccessMessage,
    string RedirectUrl,
    bool CompletedInApp,
    BillingMoneyResponse? AmountCharged,
    string? Currency,
    string? TransactionId,
    string? InvoiceReference,
    DateTimeOffset? NextBilledAt,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    IReadOnlyList<string>? Warnings = null);

public sealed record PaddleCheckoutReturnResponse(
    string RedirectUrl,
    string Plan,
    string BillingStatus,
    bool OpenCheckout = false,
    string? ClientToken = null);

public sealed record CheckoutSessionResponse(
    string CheckoutUrl,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    string TrialDisclaimer,
    bool CompletedInApp = false,
    IReadOnlyList<string>? Warnings = null);

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

public sealed record UpdateBillingContactRequest(
    string? Name,
    string? Email,
    string? PhoneCountry,
    string? PhoneLocal);
