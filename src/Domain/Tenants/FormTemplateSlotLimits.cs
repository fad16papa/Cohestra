namespace Cohestra.Domain.Tenants;

public static class FormTemplateSlotLimits
{
    public static int For(TenantPlan plan) =>
        plan switch
        {
            TenantPlan.Basic => 1,
            TenantPlan.Core => 5,
            TenantPlan.Pro => 25,
            TenantPlan.Enterprise => 999,
            _ => 1,
        };
}
