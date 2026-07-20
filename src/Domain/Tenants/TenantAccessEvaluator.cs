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
/// </summary>
public static class TenantAccessEvaluator
{
    public static TenantAccessEvaluation Evaluate(Tenant tenant) =>
        Evaluate(tenant.Status, tenant.BillingStatus);

    public static TenantAccessEvaluation Evaluate(TenantStatus status, BillingStatus billingStatus)
    {
        if (status == TenantStatus.Suspended)
        {
            return new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.Blocked,
                PublicRegistrationAllowed: false,
                PublicSurface: TenantPublicSurface.Maintenance,
                ShowSettleBanner: false);
        }

        if (status == TenantStatus.Archived)
        {
            return new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.Blocked,
                PublicRegistrationAllowed: false,
                PublicSurface: TenantPublicSurface.NotFound,
                ShowSettleBanner: false);
        }

        // TenantStatus.Active
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

            BillingStatus.Free or BillingStatus.Trialing or BillingStatus.Active or BillingStatus.Canceled
                => new TenantAccessEvaluation(
                    AdminAccess: TenantAccessMode.Full,
                    PublicRegistrationAllowed: true,
                    PublicSurface: TenantPublicSurface.Available,
                    ShowSettleBanner: false),

            _ => new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.Blocked,
                PublicRegistrationAllowed: false,
                PublicSurface: TenantPublicSurface.NotFound,
                ShowSettleBanner: false),
        };
    }
}
