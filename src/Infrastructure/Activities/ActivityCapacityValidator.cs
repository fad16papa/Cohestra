namespace Cohestra.Infrastructure.Activities;

internal static class ActivityCapacityValidator
{
    public static string? ValidateMaxRegistrants(int? maxRegistrants)
    {
        if (maxRegistrants is null)
        {
            return null;
        }

        return maxRegistrants.Value < 1
            ? "Max registrants must be at least 1 when set."
            : null;
    }

    public static string? ValidateMaxRegistrantsAgainstPlanLimit(
        int? maxRegistrants,
        int planRegistrationsPerMonth)
    {
        var formatError = ValidateMaxRegistrants(maxRegistrants);
        if (formatError is not null)
        {
            return formatError;
        }

        if (maxRegistrants is int max && max > planRegistrationsPerMonth)
        {
            return
                $"Max registrants cannot exceed your plan limit of {planRegistrationsPerMonth:N0} registrations per month.";
        }

        return null;
    }

    public static string? ValidateMaxRegistrantsAgainstCount(int? maxRegistrants, int registrationCount)
    {
        var formatError = ValidateMaxRegistrants(maxRegistrants);
        if (formatError is not null)
        {
            return formatError;
        }

        if (maxRegistrants is int max && max < registrationCount)
        {
            return $"Max registrants cannot be lower than current registration count ({registrationCount}).";
        }

        return null;
    }

    public static bool IsRegistrationFull(int? maxRegistrants, int registrationCount) =>
        maxRegistrants is int max && registrationCount >= max;
}
