using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityMapper
{
    public static ActivityResponse ToResponse(
        Activity activity,
        ResolvedRegistrationThemeDto resolvedTheme,
        int registrationCount = 0,
        string? heroImageUrl = null) =>
        new(
            activity.Id,
            activity.Name,
            activity.Slug,
            activity.Category,
            activity.Schedule,
            activity.Location,
            activity.CommunityLabel,
            heroImageUrl ?? activity.HeroImageUrl,
            activity.AccentColor,
            RegistrationThemeMapper.ToDto(activity.RegistrationTheme),
            resolvedTheme,
            activity.Status.ToString().ToLowerInvariant(),
            activity.ShowOnHomepage,
            FormSchemaMapper.ToDto(activity.FormSchema),
            activity.MaxRegistrants,
            registrationCount,
            activity.CreatedAt,
            activity.UpdatedAt);
}
