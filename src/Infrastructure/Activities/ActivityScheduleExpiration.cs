using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Activities;

public static class ActivityScheduleExpiration
{
    public static DateTimeOffset? ResolveStartsAt(Activity activity, DateTimeOffset referenceUtc = default) =>
        activity.ScheduledStartsAt
        ?? ActivityScheduleParser.TryParseStartsAt(activity.Schedule, referenceUtc);

    public static bool IsPastEventEnd(
        Activity activity,
        string registrationTimeZoneId,
        DateTimeOffset utcNow)
    {
        var startsAt = ResolveStartsAt(activity, utcNow);
        if (startsAt is null)
        {
            return false;
        }

        return IsPastEventEnd(startsAt.Value, registrationTimeZoneId, utcNow);
    }

    public static bool IsPastEventEnd(
        DateTimeOffset startsAtUtc,
        string registrationTimeZoneId,
        DateTimeOffset utcNow)
    {
        var timeZone = ResolveTimeZone(registrationTimeZoneId);
        var localStart = TimeZoneInfo.ConvertTime(startsAtUtc, timeZone);
        var endOfEventDayLocal = new DateTime(
            localStart.Year,
            localStart.Month,
            localStart.Day,
            23,
            59,
            59,
            999,
            DateTimeKind.Unspecified);
        var endOfEventDayUtc = TimeZoneInfo.ConvertTimeToUtc(endOfEventDayLocal, timeZone);
        return utcNow > endOfEventDayUtc;
    }

    public static bool IsRegistrationOpen(
        Activity activity,
        string registrationTimeZoneId,
        DateTimeOffset utcNow) =>
        activity.Status == ActivityStatus.Published
        && !IsPastEventEnd(activity, registrationTimeZoneId, utcNow);

    private static TimeZoneInfo ResolveTimeZone(string registrationTimeZoneId)
    {
        if (string.IsNullOrWhiteSpace(registrationTimeZoneId))
        {
            return TimeZoneInfo.Utc;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(registrationTimeZoneId.Trim());
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
