using Cohestra.Application.Tenants;
using Cohestra.Contracts.Admin;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tenants;

public sealed class TenantShellService(CohestraDbContext dbContext) : ITenantShellService
{
    public async Task<TenantShellResponse> GetShellAsync(
        Guid tenantId,
        bool isTenantAdmin,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        var limits = TenantPlanLimits.For(tenant.Plan);
        var now = DateTimeOffset.UtcNow;
        var timeZoneId = tenant.RegistrationTimeZoneId;
        var usage = await ComputeUsageAsync(tenantId, timeZoneId, now, cancellationToken);
        var nextReset = RegistrationPeriod.GetNextMonthStartUtc(now, timeZoneId);
        var limitDials = BuildLimitDials(limits, usage, timeZoneId, nextReset);
        var billingBanner = BuildBillingBanner(tenant, limitDials, isTenantAdmin);

        return new TenantShellResponse(
            tenant.Plan.ToString(),
            tenant.BillingStatus.ToString(),
            tenant.BillingInterval?.ToString(),
            tenant.TrialEndsAt,
            tenant.IsComplimentary,
            isTenantAdmin,
            tenant.Slug,
            tenant.Name,
            RegistrationTimeZoneSupport.Normalize(timeZoneId),
            nextReset,
            new PlanLimitsResponse(
                limits.Seats,
                limits.Communities,
                limits.PublishedActivities,
                limits.RegistrationsPerMonth),
            usage,
            limitDials,
            billingBanner);
    }

    internal static async Task<PlanUsageResponse> ComputeUsageAsync(
        CohestraDbContext dbContext,
        Guid tenantId,
        string? registrationTimeZoneId,
        DateTimeOffset utcNow,
        CancellationToken cancellationToken)
    {
        var monthStart = RegistrationPeriod.GetMonthStartUtc(utcNow, registrationTimeZoneId);

        var activeMembers = await dbContext.TenantMemberships
            .AsNoTracking()
            .CountAsync(m => m.TenantId == tenantId, cancellationToken);

        var pendingInvites = await dbContext.TenantInvites
            .AsNoTracking()
            .CountAsync(
                i => i.TenantId == tenantId
                    && i.RevokedAt == null
                    && i.AcceptedAt == null
                    && i.ExpiresAt > utcNow,
                cancellationToken);

        var seatsUsed = activeMembers + pendingInvites;

        var communities = await dbContext.Communities
            .AsNoTracking()
            .CountAsync(c => c.TenantId == tenantId, cancellationToken);

        var publishedActivities = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(
                a => a.TenantId == tenantId && a.Status == ActivityStatus.Published,
                cancellationToken);

        var registrationsThisMonth = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                r => r.TenantId == tenantId && r.CreatedAt >= monthStart,
                cancellationToken);

        return new PlanUsageResponse(seatsUsed, communities, publishedActivities, registrationsThisMonth);
    }

    private Task<PlanUsageResponse> ComputeUsageAsync(
        Guid tenantId,
        string? registrationTimeZoneId,
        DateTimeOffset utcNow,
        CancellationToken cancellationToken) =>
        ComputeUsageAsync(dbContext, tenantId, registrationTimeZoneId, utcNow, cancellationToken);

    internal static IReadOnlyList<LimitDialResponse> BuildLimitDials(
        PlanLimits limits,
        PlanUsageResponse usage,
        string? registrationTimeZoneId,
        DateTimeOffset registrationMonthResetsAt)
    {
        var tzLabel = RegistrationTimeZoneSupport.GetDisplayLabel(registrationTimeZoneId);
        var registrationHint = RegistrationTimeZoneSupport.FormatResetHint(
            registrationMonthResetsAt,
            registrationTimeZoneId);

        return
        [
            BuildDial("seats", "Team seats", usage.SeatsUsed, limits.Seats),
            BuildDial("communities", "Communities", usage.Communities, limits.Communities),
            BuildDial("published", "Published activities", usage.PublishedActivities, limits.PublishedActivities),
            BuildDial(
                "registrations",
                $"Registrations this month ({tzLabel})",
                usage.RegistrationsThisMonth,
                limits.RegistrationsPerMonth,
                registrationHint),
        ];
    }

    private static LimitDialResponse BuildDial(
        string key,
        string label,
        int used,
        int limit,
        string? hint = null)
    {
        var percent = limit <= 0 ? 0 : (int)Math.Min(100, Math.Round(used * 100.0 / limit));
        var blocked = string.Equals(key, "seats", StringComparison.Ordinal)
            ? used > limit
            : used >= limit;
        return new LimitDialResponse(
            key,
            label,
            used,
            limit,
            percent,
            Warn: percent >= 80 && !blocked,
            Blocked: blocked,
            Hint: hint);
    }

    internal static BillingBannerResponse? BuildBillingBanner(
        Tenant tenant,
        IReadOnlyList<LimitDialResponse> limitDials,
        bool isTenantAdmin)
    {
        if (tenant.IsComplimentary)
        {
            return null;
        }

        if (tenant.BillingStatus == BillingStatus.PastDue)
        {
            return new BillingBannerResponse(
                "past_due",
                "Payment past due",
                "Your last payment did not succeed. Update your payment method to keep full access.",
                isTenantAdmin ? "Settle balance" : null,
                isTenantAdmin ? "/settings/billing" : null,
                AdminOnlyCta: true);
        }

        if (tenant.BillingStatus == BillingStatus.OnHold)
        {
            return new BillingBannerResponse(
                "on_hold",
                "Read-only mode",
                "Billing is on hold. The workspace is read-only until payment is restored.",
                isTenantAdmin ? "Manage billing" : null,
                isTenantAdmin ? "/settings/billing" : null,
                AdminOnlyCta: true);
        }

        if (tenant.BillingStatus == BillingStatus.Trialing
            && tenant.TrialEndsAt is { } trialEnd
            && trialEnd > DateTimeOffset.UtcNow
            && trialEnd <= DateTimeOffset.UtcNow.AddDays(7))
        {
            return new BillingBannerResponse(
                "trialing",
                "Trial ending soon",
                $"Your trial ends on {trialEnd:MMMM d, yyyy}. You will not be charged until then unless you cancel.",
                isTenantAdmin ? "Manage billing" : null,
                isTenantAdmin ? "/settings/billing" : null,
                AdminOnlyCta: true);
        }

        var overLimitDial = limitDials.FirstOrDefault(d =>
            d.Blocked
            && !string.Equals(d.Key, "seats", StringComparison.Ordinal));
        if (overLimitDial is not null)
        {
            var canUpgrade = tenant.Plan is TenantPlan.Basic or TenantPlan.Core;
            var upgradePlan = SuggestUpgradePlanSlug(tenant.Plan);
            return new BillingBannerResponse(
                "read_only_over_limit",
                "Plan limit reached",
                $"{overLimitDial.Label} is at capacity ({overLimitDial.Used}/{overLimitDial.Limit}). Archive or unpublish items{(canUpgrade ? ", or upgrade your plan" : "")}.",
                isTenantAdmin && canUpgrade ? "Upgrade plan" : null,
                isTenantAdmin && canUpgrade ? $"/billing/checkout?plan={upgradePlan}&interval=monthly&start=1" : null,
                AdminOnlyCta: true);
        }

        return null;
    }

    private static string SuggestUpgradePlanSlug(TenantPlan plan) =>
        plan switch
        {
            TenantPlan.Basic => "core",
            TenantPlan.Core => "pro",
            _ => "pro",
        };
}
