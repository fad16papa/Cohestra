using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaPlanGate
{
    internal static void EnsureAllowed(ActivityFormSchema schema, TenantPlan plan)
    {
        var hasRecipes = schema.Fields.Any(field => field.VisibleWhen is not null);
        var hasSteps = schema.Meta is { SplitIntoSteps: true };
        var hasCorePlusFields = schema.Fields.Any(field =>
            FormFieldTypes.CorePlusOnly.Contains(field.Type));

        if (!hasRecipes && !hasSteps && !hasCorePlusFields)
        {
            return;
        }

        if (hasCorePlusFields && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Scale and emergency contact fields require a Core or Pro plan.");
        }

        if (hasRecipes && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Form Recipes require a Core or Pro plan.");
        }

        if (hasSteps && plan is not (TenantPlan.Pro or TenantPlan.Enterprise))
        {
            throw new FormSchemaPlanLockedException(
                "Split into steps requires a Pro plan.");
        }
    }
}
