using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;

namespace Cohestra.Infrastructure.Activities;

/// <summary>
/// Shared registration theme resolution for public surfaces, email, and future touchpoints.
/// </summary>
internal static class RegistrationThemeQueries
{
    public static ResolvedRegistrationThemeDto ResolveForActivity(
        Activity activity,
        Community? community) =>
        RegistrationThemeResolver.Resolve(activity.RegistrationTheme, community, activity);

    public static async Task<ResolvedRegistrationThemeDto> ResolveForActivityAsync(
        CohestraDbContext dbContext,
        Activity activity,
        CancellationToken cancellationToken = default)
    {
        var community = await CommunityQueries.GetByLabelAsync(
            dbContext,
            activity.TenantId,
            activity.CommunityLabel,
            cancellationToken);

        return ResolveForActivity(activity, community);
    }
}
