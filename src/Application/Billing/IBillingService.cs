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
    string TrialDisclaimer);

public sealed record CreatePortalSessionCommand(
    Guid TenantId,
    string ReturnUrl);

public sealed record PortalSessionDto(string PortalUrl);
