using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationDesignTokensPlanGate
{
    internal static void NormalizeForPlan(RegistrationTheme theme, TenantPlan plan)
    {
        if (plan is not TenantPlan.Basic || theme.DesignTokens is null)
        {
            return;
        }

        var tokens = theme.DesignTokens;

        if (tokens.TypographyScale is RegistrationTypographyScales.Spacious)
        {
            tokens.TypographyScale = RegistrationTypographyScales.Default;
        }

        if (tokens.FieldSize is RegistrationFieldSizes.Comfortable)
        {
            tokens.FieldSize = RegistrationFieldSizes.Default;
        }

        if (tokens.FieldRadius is RegistrationFieldRadii.Lg)
        {
            tokens.FieldRadius = RegistrationFieldRadii.Md;
        }

        if (tokens.SurfaceEmphasis is RegistrationSurfaceEmphases.Elevated)
        {
            tokens.SurfaceEmphasis = RegistrationSurfaceEmphases.Soft;
        }
    }

    internal static string? EnsureAllowed(RegistrationTheme theme, TenantPlan plan)
    {
        if (plan is not TenantPlan.Basic || theme.DesignTokens is null)
        {
            return null;
        }

        var tokens = theme.DesignTokens;

        if (tokens.TypographyScale is RegistrationTypographyScales.Spacious)
        {
            return "Spacious typography requires a Core or Pro plan.";
        }

        if (tokens.FieldSize is RegistrationFieldSizes.Comfortable)
        {
            return "Comfortable field size requires a Core or Pro plan.";
        }

        if (tokens.FieldRadius is RegistrationFieldRadii.Lg)
        {
            return "Large field radius requires a Core or Pro plan.";
        }

        if (tokens.SurfaceEmphasis is RegistrationSurfaceEmphases.Elevated)
        {
            return "Elevated surface emphasis requires a Core or Pro plan.";
        }

        return null;
    }
}
