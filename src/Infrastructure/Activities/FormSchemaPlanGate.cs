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
        var hasDomain = CompositionUsesDomain(schema.Composition);

        if (!hasRecipes && !hasSteps && !hasCorePlusFields && !hasColumns && !hasDomain)
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

        if (hasDomain && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Activity and community blocks require a Core or Pro plan.");
        }
    }

    internal static bool CompositionUsesColumns(IReadOnlyList<FormCompositionNode>? composition) =>
        CompositionUsesKind(composition, FormCompositionKinds.Columns);

    internal static bool CompositionUsesDomain(IReadOnlyList<FormCompositionNode>? composition) =>
        CompositionUsesKind(composition, FormCompositionKinds.Domain);

    private static bool CompositionUsesKind(
        IReadOnlyList<FormCompositionNode>? composition,
        string kind)
    {
        if (composition is null or { Count: 0 })
        {
            return false;
        }

        return Walk(composition, kind);

        static bool Walk(IEnumerable<FormCompositionNode> nodes, string targetKind)
        {
            foreach (var node in nodes)
            {
                if (string.Equals(node.Kind, targetKind, StringComparison.Ordinal))
                {
                    return true;
                }

                if (node.Children is { Count: > 0 } && Walk(node.Children, targetKind))
                {
                    return true;
                }

                if (node.Columns is not { Count: > 0 })
                {
                    continue;
                }

                foreach (var column in node.Columns)
                {
                    if (column is { Count: > 0 } && Walk(column, targetKind))
                    {
                        return true;
                    }
                }
            }

            return false;
        }
    }
}
