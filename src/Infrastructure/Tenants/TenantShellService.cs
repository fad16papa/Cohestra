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
        var usage = await ComputeUsageAsync(tenantId, cancellationToken);
        var limitDials = BuildLimitDials(limits, usage);
        var billingBanner = BuildBillingBanner(tenant, limitDials, isTenantAdmin);

        return new TenantShellResponse(
            tenant.Plan.ToString(),
            tenant.BillingStatus.ToString(),
            tenant.BillingInterval?.ToString(),
            tenant.TrialEndsAt,
            tenant.IsComplimentary,
            isTenantAdmin,
            new PlanLimitsResponse(
                limits.Seats,
                limits.Communities,
                limits.PublishedActivities,
                limits.RegistrationsPerMonth),
            usage,
            limitDials,
            billingBanner);
    }

    private async Task<PlanUsageResponse> ComputeUsageAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var monthStart = new DateTimeOffset(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,
            0,
            0,
            0,
            TimeSpan.Zero);

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

        return new PlanUsageResponse(communities, publishedActivities, registrationsThisMonth);
    }

    internal static IReadOnlyList<LimitDialResponse> BuildLimitDials(
        PlanLimits limits,
        PlanUsageResponse usage)
    {
        return
        [
            BuildDial("communities", "Communities", usage.Communities, limits.Communities),
            BuildDial("published", "Published activities", usage.PublishedActivities, limits.PublishedActivities),
            BuildDial("registrations", "Registrations this month", usage.RegistrationsThisMonth, limits.RegistrationsPerMonth),
        ];
    }

    private static LimitDialResponse BuildDial(string key, string label, int used, int limit)
    {
        var percent = limit <= 0 ? 0 : (int)Math.Min(100, Math.Round(used * 100.0 / limit));
        return new LimitDialResponse(
            key,
            label,
            used,
            limit,
            percent,
            Warn: percent >= 80 && percent < 100,
            Blocked: used >= limit);
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

        var overLimitDial = limitDials.FirstOrDefault(d => d.Blocked);
        if (overLimitDial is not null)
        {
            var upgradePlan = SuggestUpgradePlanSlug(tenant.Plan);
            return new BillingBannerResponse(
                "read_only_over_limit",
                "Plan limit reached",
                $"{overLimitDial.Label} is at capacity ({overLimitDial.Used}/{overLimitDial.Limit}). Archive or unpublish items, or upgrade your plan.",
                isTenantAdmin ? "Upgrade plan" : null,
                isTenantAdmin ? $"/billing/checkout?plan={upgradePlan}&interval=monthly" : null,
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
