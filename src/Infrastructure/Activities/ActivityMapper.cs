using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityMapper
{
    public static ActivityResponse ToResponse(
        Activity activity,
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
            activity.Status.ToString().ToLowerInvariant(),
            activity.ShowOnHomepage,
            FormSchemaMapper.ToDto(activity.FormSchema),
            registrationCount,
            activity.CreatedAt,
            activity.UpdatedAt);
}
