using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationExperiencePlanGate
{
    internal static void NormalizeForPlan(RegistrationTheme theme, TenantPlan plan)
    {
        var resolved = RegistrationExperienceResolver.Resolve(theme);

        if (plan is TenantPlan.Basic)
        {
            Apply(theme, RegistrationExperienceLayouts.Centered, resolved.Style, RegistrationExperienceFlows.SinglePage, resolved.HeroDisplay);
            return;
        }

        if (plan is TenantPlan.Core)
        {
            if (resolved.Flow is RegistrationExperienceFlows.Conversational)
            {
                Apply(theme, resolved.Layout, resolved.Style, RegistrationExperienceFlows.SinglePage, resolved.HeroDisplay);
            }

            return;
        }

        // Pro / Enterprise — no downgrade in normalize
    }

    internal static string? EnsureAllowed(RegistrationTheme theme, TenantPlan plan)
    {
        var resolved = RegistrationExperienceResolver.Resolve(theme);

        if (plan is TenantPlan.Basic)
        {
            if (resolved.Layout is not RegistrationExperienceLayouts.Centered and not RegistrationExperienceLayouts.Card)
            {
                return "Split and poster layouts require a Core or Pro plan.";
            }

            if (resolved.Flow is not RegistrationExperienceFlows.SinglePage)
            {
                return "Advanced registration flows require a Core or Pro plan.";
            }
        }

        if (plan is TenantPlan.Core)
        {
            if (resolved.Flow is RegistrationExperienceFlows.Conversational)
            {
                return "Conversational registration flow requires a Pro plan.";
            }
        }

        return null;
    }

    private static void Apply(
        RegistrationTheme theme,
        string layout,
        string style,
        string flow,
        string heroDisplay)
    {
        theme.Experience ??= new RegistrationExperience();
        theme.Experience.Layout = layout;
        theme.Experience.Style = style;
        theme.Experience.Flow = flow;
        theme.Experience.HeroDisplay = heroDisplay;
    }
}
