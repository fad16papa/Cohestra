using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaPlanGate
{
    internal static void NormalizePublisherWebsiteLink(ActivityFormSchema schema, TenantPlan plan)
    {
        if (schema.Meta is null)
        {
            return;
        }

        if (plan is TenantPlan.Basic)
        {
            schema.Meta.ShowPublisherWebsiteLink = null;
            return;
        }

        if (plan is TenantPlan.Core or TenantPlan.Pro or TenantPlan.Enterprise)
        {
            return;
        }

        schema.Meta.ShowPublisherWebsiteLink = null;
    }

    internal static void EnsureAllowed(ActivityFormSchema schema, TenantPlan plan)
    {
        if (schema.Meta is { ShowPublisherWebsiteLink: true } && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Linking your Cohestra website on registration forms requires a Core or Pro plan.");
        }

        var hasRecipes = schema.Fields.Any(field => field.VisibleWhen is not null);
        var hasSteps = schema.Meta is { SplitIntoSteps: true };
        var hasCorePlusFields = schema.Fields.Any(field =>
            FormFieldTypes.CorePlusOnly.Contains(field.Type));
        var hasColumns = CompositionUsesColumns(schema.Composition);

        if (!hasRecipes && !hasSteps && !hasCorePlusFields && !hasColumns)
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

        if (hasColumns && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Two-column layouts require a Core or Pro plan.");
        }
    }

    internal static bool CompositionUsesColumns(IReadOnlyList<FormCompositionNode>? composition)
    {
        if (composition is null or { Count: 0 })
        {
            return false;
        }

        return Walk(composition);

        static bool Walk(IEnumerable<FormCompositionNode> nodes)
        {
            foreach (var node in nodes)
            {
                if (node.Kind == FormCompositionKinds.Columns)
                {
                    return true;
                }

                if (node.Children is { Count: > 0 } && Walk(node.Children))
                {
                    return true;
                }

                if (node.Columns is not { Count: > 0 })
                {
                    continue;
                }

                foreach (var column in node.Columns)
                {
                    if (column is { Count: > 0 } && Walk(column))
                    {
                        return true;
                    }
                }
            }

            return false;
        }
    }
}
