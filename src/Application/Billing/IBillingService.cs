using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Billing;

public interface IBillingService
{
    Task<BillingSummaryDto> GetSummaryAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<CheckoutSessionDto> CreateCheckoutSessionAsync(
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken = default);

    Task<PreviewPlanChangeDto> PreviewPlanChangeAsync(
        PreviewPlanChangeCommand command,
        CancellationToken cancellationToken = default);

    Task<ConfirmPlanChangeDto> ConfirmPlanChangeAsync(
        ConfirmPlanChangeCommand command,
        CancellationToken cancellationToken = default);

    Task<PortalSessionDto> CreatePortalSessionAsync(
        CreatePortalSessionCommand command,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Pull the latest merchant subscription state for this tenant (checkout return / manual refresh).
    /// </summary>
    Task<BillingSummaryDto> SyncFromProviderAsync(
        Guid tenantId,
        string? transactionId = null,
        CancellationToken cancellationToken = default);

    Task ValidateBillingAccessAsync(
        Guid tenantId,
        string? operatorEmail,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Hostname of a DNS-verified custom domain, or null. Never request-supplied.
    /// </summary>
    Task<string?> GetVerifiedCustomDomainAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<BillingDetailsDto> GetDetailsAsync(
        Guid tenantId,
        string operatorEmail,
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

    Task CancelScheduledPlanChangeAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default);
}

public sealed record BillingUsageDto(
    int SeatsUsed,
    int Communities,
    int PublishedActivities,
    int RegistrationsThisMonth);

public sealed record BillingPlanLimitsDto(
    int Seats,
    int Communities,
    int PublishedActivities,
    int RegistrationsPerMonth);

public sealed record BillingSummaryDto(
    TenantPlan Plan,
    BillingStatus BillingStatus,
    BillingInterval? BillingInterval,
    DateTimeOffset? TrialEndsAt,
    bool HasConsumedTrial,
    bool BillingConfigured,
    string? ClientToken,
    int TrialPeriodDays,
    bool IsComplimentary,
    BillingUsageDto? Usage = null,
    BillingPlanLimitsDto? CoreLimits = null,
    BillingPlanLimitsDto? ProLimits = null,
    TenantPlan? ScheduledPlan = null,
    DateTimeOffset? ScheduledPlanEffectiveAt = null,
    BillingInterval? ScheduledBillingInterval = null,
    bool CancelAtPeriodEnd = false);

public sealed record CreateCheckoutSessionCommand(
    Guid TenantId,
    string TenantSlug,
    TenantPlan Plan,
    BillingInterval Interval,
    string AdminEmail,
    string SuccessUrl,
    string CancelUrl);

public sealed record BillingMoneyDto(long AmountMinor, string Currency);

public sealed record PreviewPlanChangeCommand(
    Guid TenantId,
    string TenantSlug,
    TenantPlan Plan,
    BillingInterval Interval);

public sealed record PreviewPlanChangeDto(
    string CurrentPlan,
    string CurrentInterval,
    string TargetPlan,
    string TargetInterval,
    string? Currency,
    BillingMoneyDto? Credit,
    BillingMoneyDto? DueNow,
    BillingMoneyDto? NextRecurringAmount,
    DateTimeOffset? NextBilledAt,
    bool ProviderPreviewAvailable,
    bool Deferred,
    string PreviewState,
    string ReviewCopy,
    string ConfirmLabel);

public sealed record ConfirmPlanChangeCommand(
    Guid TenantId,
    string TenantSlug,
    TenantPlan Plan,
    BillingInterval Interval,
    string? PreviewState,
    string SuccessUrl,
    string CancelUrl);

public sealed record ConfirmPlanChangeDto(
    string SuccessMessage,
    string RedirectUrl,
    bool CompletedInApp,
    BillingMoneyDto? AmountCharged,
    string? Currency,
    string? TransactionId,
    string? InvoiceReference,
    DateTimeOffset? NextBilledAt,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    IReadOnlyList<string>? Warnings = null);

public sealed record CheckoutSessionDto(
    string CheckoutUrl,
    DateTimeOffset? TrialEndsAt,
    bool TrialIncluded,
    string TrialDisclaimer,
    bool CompletedInApp = false,
    IReadOnlyList<string>? Warnings = null);

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
