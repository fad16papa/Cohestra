using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Billing management is restricted to the workspace billing owner
/// (tenant <see cref="Tenant.AdminContactEmail"/>) on paid Core/Pro plans.
/// </summary>
public static class TenantBillingAccess
{
    public static bool RequiresBillingOwner(TenantPlan plan) =>
        plan is TenantPlan.Core or TenantPlan.Pro;

    public static bool IsBillingOwner(Tenant tenant, string? operatorEmail)
    {
        if (string.IsNullOrWhiteSpace(operatorEmail)
            || string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            return false;
        }

        return string.Equals(
            operatorEmail.Trim(),
            tenant.AdminContactEmail.Trim(),
            StringComparison.OrdinalIgnoreCase);
    }

    public static bool CanManageBilling(Tenant tenant, string? operatorEmail, bool isTenantAdmin)
    {
        if (!isTenantAdmin)
        {
            return false;
        }

        if (!RequiresBillingOwner(tenant.Plan))
        {
            return true;
        }

        return IsBillingOwner(tenant, operatorEmail);
    }
}
