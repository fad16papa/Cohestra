using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

public static class BillingDowngradeLimitWarnings
{
    public static IReadOnlyList<string> Build(TenantUsageSnapshot usage, TenantPlan targetPlan)
    {
        if (targetPlan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            return [];
        }

        var limits = TenantPlanLimits.For(targetPlan);
        var warnings = new List<string>();
        var label = targetPlan == TenantPlan.Pro ? "Pro" : "Core";

        if (usage.SeatsUsed > limits.Seats)
        {
            warnings.Add(
                $"Team seats: you have {usage.SeatsUsed} but {label} allows {limits.Seats}. Remove members or pending invites before the switch date.");
        }

        if (usage.Communities >= limits.Communities)
        {
            warnings.Add(
                $"Communities: you have {usage.Communities} but {label} allows {limits.Communities}. Archive or merge communities before the switch date.");
        }

        if (usage.PublishedActivities >= limits.PublishedActivities)
        {
            warnings.Add(
                $"Published activities: you have {usage.PublishedActivities} but {label} allows {limits.PublishedActivities}. Unpublish or archive activities before the switch date.");
        }

        if (usage.RegistrationsThisMonth >= limits.RegistrationsPerMonth)
        {
            warnings.Add(
                $"Registrations this month: you have {usage.RegistrationsThisMonth:N0} but {label} allows {limits.RegistrationsPerMonth:N0}. Usage may block public sign-ups after the switch until the next reset.");
        }

        return warnings;
    }
}
