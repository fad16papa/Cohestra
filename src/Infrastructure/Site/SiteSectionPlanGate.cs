using Cohestra.Contracts.Site;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Site;

/// <summary>
/// Plan gates for website builder section types (Essentials on Core+, Studio on Pro+).
/// </summary>
public static class SiteSectionPlanGate
{
    public static readonly IReadOnlySet<string> EssentialsSectionTypes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "hero",
            "highlights",
            "upcomingActivities",
            "howItWorks",
            "footer",
        };

    public static readonly IReadOnlySet<string> StudioSectionTypes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "carousel",
            "testimonials",
            "faq",
            "stats",
            "ctaBand",
        };

    public static bool IsStudioSection(string sectionType) =>
        StudioSectionTypes.Contains(NormalizeType(sectionType));

    public static bool IsAllowedForPlan(string sectionType, TenantPlan plan)
    {
        var normalized = NormalizeType(sectionType);
        if (EssentialsSectionTypes.Contains(normalized))
        {
            return true;
        }

        if (StudioSectionTypes.Contains(normalized))
        {
            return plan is TenantPlan.Pro or TenantPlan.Enterprise;
        }

        return false;
    }

    public static bool IsPresetAllowedForPlan(string presetId, TenantPlan plan)
    {
        if (plan is TenantPlan.Pro or TenantPlan.Enterprise)
        {
            return true;
        }

        var normalized = presetId.Trim();
        return string.Equals(normalized, "community", StringComparison.OrdinalIgnoreCase)
            || string.Equals(normalized, "minimal", StringComparison.OrdinalIgnoreCase);
    }

    public static string? ValidateDocument(SiteSectionsDocument document, TenantPlan plan)
    {
        foreach (var section in document.Sections)
        {
            if (IsAllowedForPlan(section.Type, plan))
            {
                continue;
            }

            if (IsStudioSection(section.Type))
            {
                return "Studio sections (carousel, testimonials, FAQ, stats, CTA band) require a Pro plan.";
            }

            return $"Section type \"{section.Type}\" is not allowed on your plan.";
        }

        return null;
    }

    public static string? ValidateDocumentDto(SiteSectionsDocumentDto dto, TenantPlan plan) =>
        ValidateDocument(ToDocument(dto), plan);

    private static SiteSectionsDocument ToDocument(SiteSectionsDocumentDto dto) =>
        new()
        {
            SchemaVersion = dto.SchemaVersion,
            SiteName = dto.SiteName ?? string.Empty,
            AccentColor = dto.AccentColor,
            LogoAssetId = dto.LogoAssetId,
            PresetId = dto.PresetId,
            Sections = dto.Sections
                .Select(section => new SiteSection
                {
                    Id = section.Id,
                    Type = section.Type,
                    Enabled = section.Enabled,
                    Order = section.Order,
                    Props = section.Props,
                })
                .ToList(),
        };

    private static string NormalizeType(string sectionType) =>
        sectionType.Trim();
}
