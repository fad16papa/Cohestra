namespace Cohestra.Infrastructure.Tenants;

/// <summary>
/// Plan capacity checks aligned with admin shell limit dials (block at used &gt;= limit).
/// </summary>
public static class TenantPlanLimitValidator
{
    public const string LimitReachedSuffix =
        "Limit reached — upgrade or free capacity before adding more.";

    public static bool IsAtOrOverCapacity(int used, int limit) =>
        limit > 0 && used >= limit;

    public static string? ValidateCanAddCommunity(int communitiesUsed, int communityLimit) =>
        IsAtOrOverCapacity(communitiesUsed, communityLimit)
            ? FormatCapacityMessage("Communities", communitiesUsed, communityLimit)
            : null;

    public static string? ValidateCanPublishActivity(
        int publishedActivitiesUsed,
        int publishedActivityLimit) =>
        IsAtOrOverCapacity(publishedActivitiesUsed, publishedActivityLimit)
            ? FormatCapacityMessage("Published activities", publishedActivitiesUsed, publishedActivityLimit)
            : null;

    public static string? ValidateCanAcceptRegistration(
        int registrationsThisMonth,
        int registrationLimit) =>
        IsAtOrOverCapacity(registrationsThisMonth, registrationLimit)
            ? $"Monthly registration limit reached ({registrationsThisMonth:N0}/{registrationLimit:N0}). Upgrade your plan or wait until next month."
            : null;

    private static string FormatCapacityMessage(string label, int used, int limit) =>
        $"{label} is at capacity ({used}/{limit}). {LimitReachedSuffix}";
}
