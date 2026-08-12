namespace Cohestra.Domain.Tenants;

/// <summary>
/// Why admin writes are read-only. Used to allow limit-recovery mutations (FR-24).
/// </summary>
public enum TenantReadOnlyReason
{
    None = 0,
    BillingOnHold = 1,
    OverPlanLimits = 2,
}
