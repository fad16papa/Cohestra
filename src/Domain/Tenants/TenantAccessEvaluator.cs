using Cohestra.Domain.Billing;

namespace Cohestra.Domain.Tenants;

/// <summary>
/// Result of evaluating Tenant.Status ∩ BillingStatus (PRD FR-3 / AD-11).
/// Does not mutate tenant state. ReadOnly_OverLimit (FR-24) is out of scope.
/// </summary>
public readonly record struct TenantAccessEvaluation(
    TenantAccessMode AdminAccess,
    bool PublicRegistrationAllowed,
    TenantPublicSurface PublicSurface,
    bool ShowSettleBanner);

/// <summary>
/// Canonical FR-3 access matrix. Suspended always wins over billing.
/// OnHold keeps TenantStatus.Active — this evaluator never changes Status.
/// Active + Canceled is fail-closed Blocked (inconsistent dual-dial; period-end cancel should land on Free).
/// Note: FR-23 / FR-25 jobs (not implemented here) must consult <see cref="Tenant.IsComplimentary"/> —
/// complimentary tenants skip delinquency; complimentary Core/Pro skip Basic dormancy.
/// </summary>
public static class TenantAccessEvaluator
{
    public static TenantAccessEvaluation Evaluate(Tenant tenant)
    {
        ArgumentNullException.ThrowIfNull(tenant);
        return Evaluate(tenant.Status, tenant.BillingStatus);
    }

    public static TenantAccessEvaluation Evaluate(TenantStatus status, BillingStatus billingStatus)
    {
        if (status == TenantStatus.Suspended)
        {
            return Blocked(TenantPublicSurface.Maintenance);
        }

        if (status == TenantStatus.Archived)
        {
            return Blocked(TenantPublicSurface.NotFound);
        }

        if (status != TenantStatus.Active || !Enum.IsDefined(status))
        {
            // Undefined / unexpected TenantStatus — fail closed (same as unknown billing).
            return Blocked(TenantPublicSurface.NotFound);
        }

        // TenantStatus.Active — FR-3 Full only for Free / Trialing / Active / PastDue.
        // Canceled is not a Full arm; rare Active+Canceled is Blocked until webhook settles to Free.
        return billingStatus switch
        {
            BillingStatus.OnHold => new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.ReadOnly,
                PublicRegistrationAllowed: false,
                PublicSurface: TenantPublicSurface.Available,
                ShowSettleBanner: false),

            BillingStatus.PastDue => new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.Full,
                PublicRegistrationAllowed: true,
                PublicSurface: TenantPublicSurface.Available,
                ShowSettleBanner: true),

            BillingStatus.Free or BillingStatus.Trialing or BillingStatus.Active
                => new TenantAccessEvaluation(
                    AdminAccess: TenantAccessMode.Full,
                    PublicRegistrationAllowed: true,
                    PublicSurface: TenantPublicSurface.Available,
                    ShowSettleBanner: false),

            _ => Blocked(TenantPublicSurface.NotFound),
        };
    }

    private static TenantAccessEvaluation Blocked(TenantPublicSurface surface) =>
        new(
            AdminAccess: TenantAccessMode.Blocked,
            PublicRegistrationAllowed: false,
            PublicSurface: surface,
            ShowSettleBanner: false);
}
