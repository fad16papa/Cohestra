using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

public static class ActivityScheduleExpiration
{
    public static DateTimeOffset? ResolveStartsAt(
        Activity activity,
        string registrationTimeZoneId,
        DateTimeOffset referenceUtc = default) =>
        activity.ScheduledStartsAt
        ?? ActivityScheduleParser.TryParseStartsAt(
            activity.Schedule,
            registrationTimeZoneId,
            referenceUtc);

    public static bool IsPastEventEnd(
        Activity activity,
        string registrationTimeZoneId,
        DateTimeOffset utcNow)
    {
        var startsAt = ResolveStartsAt(activity, registrationTimeZoneId, utcNow);
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
        var timeZone = ActivityScheduleTimeZone.Resolve(registrationTimeZoneId);
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

    public static DateTimeOffset? ResolveEventEndUtc(
        Activity activity,
        string registrationTimeZoneId)
    {
        var startsAt = ResolveStartsAt(activity, registrationTimeZoneId);
        if (startsAt is null)
        {
            return null;
        }

        var timeZone = ActivityScheduleTimeZone.Resolve(registrationTimeZoneId);
        var localStart = TimeZoneInfo.ConvertTime(startsAt.Value, timeZone);
        var endOfEventDayLocal = new DateTime(
            localStart.Year,
            localStart.Month,
            localStart.Day,
            23,
            59,
            59,
            999,
            DateTimeKind.Unspecified);

        return TimeZoneInfo.ConvertTimeToUtc(endOfEventDayLocal, timeZone);
    }
}
