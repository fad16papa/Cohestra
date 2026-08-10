using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Billing;

public interface IBillingService
{
    Task<BillingSummaryDto> GetSummaryAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<CheckoutSessionDto> CreateCheckoutSessionAsync(
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken = default);

    Task<PortalSessionDto> CreatePortalSessionAsync(
        CreatePortalSessionCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Pull the latest Stripe subscription state for this tenant (checkout return / manual refresh).
    /// </summary>
    Task<BillingSummaryDto> SyncFromStripeAsync(
        Guid tenantId,
        string? checkoutSessionId = null,
        CancellationToken cancellationToken = default);

    Task ValidateBillingAccessAsync(
        Guid tenantId,
        string? operatorEmail,
        CancellationToken cancellationToken = default);

    Task<BillingDetailsDto> GetDetailsAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default);

    Task<SetupIntentDto> CreateSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default);

    Task ConfirmSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        string setupIntentId,
        CancellationToken cancellationToken = default);

    Task UpdateBillingContactAsync(
        Guid tenantId,
        string operatorEmail,
        string? name,
        string? email,
        string? phoneCountry,
        string? phoneLocal,
        CancellationToken cancellationToken = default);

    Task CancelSubscriptionAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default);

    Task ResumeSubscriptionAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default);
}

public sealed record BillingSummaryDto(
    TenantPlan Plan,
    BillingStatus BillingStatus,
    BillingInterval? BillingInterval,
    DateTimeOffset? TrialEndsAt,
    bool HasConsumedTrial,
    bool StripeConfigured,
    string? PublishableKey,
    int TrialPeriodDays,
    bool IsComplimentary);

public sealed record CreateCheckoutSessionCommand(
    Guid TenantId,
    string TenantSlug,
    TenantPlan Plan,
    BillingInterval Interval,
    string AdminEmail,
    string SuccessUrl,
    string CancelUrl);

public sealed record CheckoutSessionDto(
    string CheckoutUrl,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    string TrialDisclaimer,
    bool CompletedInApp = false);

public sealed record CreatePortalSessionCommand(
    Guid TenantId,
    string ReturnUrl);

public sealed record PortalSessionDto(string PortalUrl);

public sealed record BillingContactDto(string Name, string Email, string? Phone);

public sealed record BillingPaymentMethodDto(
    string Id,
    string Brand,
    string Last4,
    int ExpMonth,
    int ExpYear);

public sealed record BillingSubscriptionDetailsDto(
    bool CancelAtPeriodEnd,
    DateTimeOffset? CurrentPeriodEnd,
    string? ScheduledPlan,
    DateTimeOffset? ScheduledPlanEffectiveAt);

public sealed record BillingInvoiceDto(
    string Id,
    DateTimeOffset CreatedAt,
    long AmountDueCents,
    string Currency,
    string Status,
    string? PdfUrl,
    string? HostedInvoiceUrl);

public sealed record BillingDetailsDto(
    BillingSummaryDto Summary,
    BillingContactDto? Contact,
    BillingPaymentMethodDto? PaymentMethod,
    BillingSubscriptionDetailsDto? Subscription,
    IReadOnlyList<BillingInvoiceDto> Invoices);

public sealed record SetupIntentDto(string ClientSecret, string PublishableKey);
