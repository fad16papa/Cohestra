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
            var layout =
                resolved.Layout is RegistrationExperienceLayouts.Centered or RegistrationExperienceLayouts.Card
                    ? resolved.Layout
                    : RegistrationExperienceLayouts.Centered;
            var style =
                resolved.Style is RegistrationExperienceStyles.Modern or RegistrationExperienceStyles.Minimal
                    ? resolved.Style
                    : RegistrationExperienceStyles.Modern;
            var heroDisplay =
                resolved.HeroDisplay is RegistrationExperienceHeroDisplays.Cover
                    or RegistrationExperienceHeroDisplays.Contain
                    or RegistrationExperienceHeroDisplays.Hidden
                    ? resolved.HeroDisplay
                    : RegistrationExperienceHeroDisplays.Cover;
            Apply(theme, layout, style, RegistrationExperienceFlows.SinglePage, heroDisplay);
            return;
        }

        if (plan is TenantPlan.Core)
        {
            if (resolved.Layout is RegistrationExperienceLayouts.Immersive)
            {
                Apply(
                    theme,
                    RegistrationExperienceLayouts.Centered,
                    resolved.Style,
                    resolved.Flow,
                    resolved.HeroDisplay);
                resolved = RegistrationExperienceResolver.Resolve(theme);
            }

            if (resolved.Flow is RegistrationExperienceFlows.Conversational)
            {
                Apply(
                    theme,
                    resolved.Layout,
                    resolved.Style,
                    RegistrationExperienceFlows.SinglePage,
                    resolved.HeroDisplay);
            }

            return;
        }

        // Pro / Enterprise — no downgrade in normalize
    }

    internal static string? EnsureAllowed(RegistrationTheme theme, TenantPlan plan)
    {
        var resolved = RegistrationExperienceResolver.Resolve(theme);

        var preset = RegistrationThemeValidator.NormalizePreset(theme.Preset);
        if (preset is RegistrationThemePresets.Immersive
            && plan is not (TenantPlan.Pro or TenantPlan.Enterprise))
        {
            return "Immersive Hero preset requires a Pro plan.";
        }

        if (plan is TenantPlan.Basic)
        {
            if (resolved.Layout is RegistrationExperienceLayouts.Split
                or RegistrationExperienceLayouts.Poster
                or RegistrationExperienceLayouts.Immersive)
            {
                return "Split, poster, and immersive layouts require a Core or Pro plan.";
            }

            if (resolved.Flow is not RegistrationExperienceFlows.SinglePage)
            {
                return "Advanced registration flows require a Core or Pro plan.";
            }

            if (resolved.HeroDisplay is RegistrationExperienceHeroDisplays.FullBleed
                or RegistrationExperienceHeroDisplays.Split
                or RegistrationExperienceHeroDisplays.Background)
            {
                return "Full-bleed and background hero treatments require a Core or Pro plan.";
            }

            if (resolved.Style is not RegistrationExperienceStyles.Modern
                and not RegistrationExperienceStyles.Minimal)
            {
                return "Advanced registration styles require a Core or Pro plan.";
            }
        }

        if (plan is TenantPlan.Core)
        {
            if (resolved.Layout is RegistrationExperienceLayouts.Immersive)
            {
                return "Immersive layout requires a Pro plan.";
            }

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
