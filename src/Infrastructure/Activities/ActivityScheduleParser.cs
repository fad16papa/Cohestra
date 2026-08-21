using System.Globalization;
using System.Text.RegularExpressions;

namespace Cohestra.Infrastructure.Activities;

internal static partial class ActivityScheduleParser
{
    private const string DisplayDateTimeFormat = "ddd, MMM d, yyyy, h:mm tt";

    [GeneratedRegex(
        @"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\s+(\d{1,2}):(\d{2})$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex WeekdayTimePattern();

    [GeneratedRegex(
        @"^Week\s+(\d{1,3}),\s*Saturdays?\s+(\d{1,2}):(\d{2})$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex WeekSaturdayPattern();

    public static DateTimeOffset? TryParseStartsAt(
        string? schedule,
        string? registrationTimeZoneId = null,
        DateTimeOffset referenceUtc = default)
    {
        if (string.IsNullOrWhiteSpace(schedule))
        {
            return null;
        }

        var timeZone = ActivityScheduleTimeZone.Resolve(registrationTimeZoneId);
        var trimmed = schedule.Trim();

        if (DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsedOffset))
        {
            return parsedOffset;
        }

        if (DateTime.TryParseExact(
                trimmed,
                DisplayDateTimeFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var displayParsed))
        {
            return ToOffsetInTimeZone(displayParsed, timeZone);
        }

        if (DateTime.TryParse(
                trimmed,
                CultureInfo.GetCultureInfo("en-US"),
                DateTimeStyles.AllowWhiteSpaces,
                out var parsedEnUs))
        {
            return ToOffsetInTimeZone(parsedEnUs, timeZone);
        }

        if (DateTime.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var parsedInvariant))
        {
            return ToOffsetInTimeZone(parsedInvariant, timeZone);
        }

        var weekMatch = WeekSaturdayPattern().Match(trimmed);
        if (weekMatch.Success &&
            int.TryParse(weekMatch.Groups[1].Value, out var weekNum) &&
            int.TryParse(weekMatch.Groups[2].Value, out var weekHour) &&
            int.TryParse(weekMatch.Groups[3].Value, out var weekMinute) &&
            weekNum >= 1 &&
            weekHour is >= 0 and <= 23 &&
            weekMinute is >= 0 and <= 59)
        {
            var reference = referenceUtc == default ? DateTimeOffset.UtcNow : referenceUtc;
            var localReference = TimeZoneInfo.ConvertTime(reference, timeZone);
            var localDate = localReference.Date;
            var daysUntilSaturday = ((int)DayOfWeek.Saturday - (int)localDate.DayOfWeek + 7) % 7;
            var firstSaturday = localDate.AddDays(daysUntilSaturday);
            var target = firstSaturday
                .AddDays((weekNum - 1) * 7)
                .AddHours(weekHour)
                .AddMinutes(weekMinute);

            return ToOffsetInTimeZone(target, timeZone);
        }

        var weekdayMatch = WeekdayTimePattern().Match(trimmed);
        if (weekdayMatch.Success &&
            int.TryParse(weekdayMatch.Groups[2].Value, out var hour) &&
            int.TryParse(weekdayMatch.Groups[3].Value, out var minute) &&
            TryResolveWeekdayIndex(weekdayMatch.Groups[1].Value, out var weekdayIndex))
        {
            var reference = referenceUtc == default ? DateTimeOffset.UtcNow : referenceUtc;
            var localReference = TimeZoneInfo.ConvertTime(reference, timeZone);
            var localDate = localReference.Date;
            var daysUntil = (weekdayIndex - (int)localDate.DayOfWeek + 7) % 7;
            if (daysUntil == 0)
            {
                daysUntil = 7;
            }

            var target = localDate.AddDays(daysUntil).AddHours(hour).AddMinutes(minute);
            return ToOffsetInTimeZone(target, timeZone);
        }

        return null;
    }

    private static DateTimeOffset ToOffsetInTimeZone(DateTime localDateTime, TimeZoneInfo timeZone)
    {
        var unspecified = DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified);
        return new DateTimeOffset(unspecified, timeZone.GetUtcOffset(unspecified));
    }

    private static bool TryResolveWeekdayIndex(string label, out int weekdayIndex)
    {
        weekdayIndex = label.Trim()[..3].ToLowerInvariant() switch
        {
            "sun" => 0,
            "mon" => 1,
            "tue" => 2,
            "wed" => 3,
            "thu" => 4,
            "fri" => 5,
            "sat" => 6,
            _ => -1,
        };

        return weekdayIndex >= 0;
    }
}

internal static class ActivityScheduleTimeZone
{
    public static TimeZoneInfo Resolve(string? registrationTimeZoneId)
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
