namespace Cohestra.Domain.Tenants;

public sealed record PlanLimits(
    int Seats,
    int Communities,
    int PublishedActivities,
    int RegistrationsPerMonth);

public static class TenantPlanLimits
{
    public static PlanLimits For(TenantPlan plan) =>
        plan switch
        {
            TenantPlan.Basic => new(1, 1, 3, 150),
            TenantPlan.Core => new(3, 3, 12, 500),
            TenantPlan.Pro => new(10, 10, 50, 5000),
            TenantPlan.Enterprise => new(999, 999, 999, 999_999),
            _ => new(1, 1, 3, 150),
        };
}
