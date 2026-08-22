using Cohestra.Application.Billing;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Story 29.1 spine. Checkout, portal, payment method, and Paddle API sync land in 29.2–29.5.
/// </summary>
public sealed class PaddleBillingService(
    CohestraDbContext dbContext,
    IOptions<PaddleSettings> paddleOptions,
    ITenantAccessService tenantAccessService) : IBillingService
{
    private readonly PaddleSettings _settings = paddleOptions.Value;

    public async Task<BillingSummaryDto> GetSummaryAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        var usage = await tenantAccessService.GetUsageAsync(tenantId, cancellationToken);
        var coreLimits = TenantPlanLimits.For(TenantPlan.Core);
        var proLimits = TenantPlanLimits.For(TenantPlan.Pro);

        return new BillingSummaryDto(
            tenant.Plan,
            tenant.BillingStatus,
            tenant.BillingInterval,
            tenant.TrialEndsAt,
            tenant.HasConsumedTrial,
            _settings.IsConfigured,
            string.IsNullOrWhiteSpace(_settings.ClientToken) ? null : _settings.ClientToken,
            _settings.TrialPeriodDays,
            tenant.IsComplimentary,
            new BillingUsageDto(
                usage.SeatsUsed,
                usage.Communities,
                usage.PublishedActivities,
                usage.RegistrationsThisMonth),
            MapPlanLimits(coreLimits),
            MapPlanLimits(proLimits),
            tenant.ScheduledPlan is TenantPlan.Basic ? null : tenant.ScheduledPlan,
            tenant.ScheduledPlanEffectiveAt,
            tenant.ScheduledBillingInterval);
    }

    public Task<CheckoutSessionDto> CreateCheckoutSessionAsync(
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        _ = command;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle checkout is not implemented yet.");
    }

    public Task<PortalSessionDto> CreatePortalSessionAsync(
        CreatePortalSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        _ = command;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle customer portal is not implemented yet.");
    }

    public async Task<BillingSummaryDto> SyncFromProviderAsync(
        Guid tenantId,
        string? transactionId = null,
        CancellationToken cancellationToken = default)
    {
        _ = transactionId;
        return await GetSummaryAsync(tenantId, cancellationToken);
    }

    public async Task ValidateBillingAccessAsync(
        Guid tenantId,
        string? operatorEmail,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (TenantBillingAccess.CanManageBilling(tenant, operatorEmail, isTenantAdmin: true))
        {
            return;
        }

        var owner = string.IsNullOrWhiteSpace(tenant.AdminContactEmail)
            ? "the workspace owner"
            : tenant.AdminContactEmail.Trim();

        throw new UnauthorizedAccessException(
            TenantBillingAccess.RequiresBillingOwner(tenant.Plan)
                ? $"Billing is managed by {owner}."
                : "You do not have permission to manage billing for this workspace.");
    }

    public async Task<BillingDetailsDto> GetDetailsAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        var summary = await GetSummaryAsync(tenantId, cancellationToken);
        return new BillingDetailsDto(
            summary,
            BuildLocalContact(tenant),
            null,
            BuildLocalSubscription(tenant),
            []);
    }

    public Task<SetupIntentDto> CreateSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle payment method setup is not implemented yet.");
    }

    public Task ConfirmSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        string setupIntentId,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = setupIntentId;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle payment method setup is not implemented yet.");
    }

    public Task UpdateBillingContactAsync(
        Guid tenantId,
        string operatorEmail,
        string? name,
        string? email,
        string? phoneCountry,
        string? phoneLocal,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = name;
        _ = email;
        _ = phoneCountry;
        _ = phoneLocal;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle billing contact update is not implemented yet.");
    }

    public Task CancelSubscriptionAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle subscription cancel is not implemented yet.");
    }

    public Task ResumeSubscriptionAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle subscription resume is not implemented yet.");
    }

    public Task CancelScheduledPlanChangeAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        _ = tenantId;
        _ = operatorEmail;
        _ = cancellationToken;
        throw new InvalidOperationException("Paddle scheduled plan change cancel is not implemented yet.");
    }

    private static BillingPlanLimitsDto MapPlanLimits(PlanLimits limits) =>
        new(limits.Seats, limits.Communities, limits.PublishedActivities, limits.RegistrationsPerMonth);

    private static BillingContactDto BuildLocalContact(Tenant tenant) =>
        new(tenant.Name, tenant.AdminContactEmail ?? string.Empty, null);

    private static BillingSubscriptionDetailsDto? BuildLocalSubscription(Tenant tenant)
    {
        if (tenant.Plan is TenantPlan.Basic)
        {
            return null;
        }

        return new BillingSubscriptionDetailsDto(
            tenant.ScheduledPlan == TenantPlan.Basic && tenant.ScheduledPlanEffectiveAt is not null,
            tenant.ScheduledPlanEffectiveAt,
            tenant.ScheduledPlan?.ToString(),
            tenant.ScheduledPlanEffectiveAt);
    }
}
