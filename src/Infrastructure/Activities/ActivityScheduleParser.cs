using System.Globalization;
using System.Text.RegularExpressions;

namespace Cohestra.Infrastructure.Activities;

internal static partial class ActivityScheduleParser
{
    [GeneratedRegex(
        @"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\s+(\d{1,2}):(\d{2})$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex WeekdayTimePattern();

    public static DateTimeOffset? TryParseStartsAt(string? schedule, DateTimeOffset referenceUtc = default)
    {
        if (string.IsNullOrWhiteSpace(schedule))
        {
            return null;
        }

        var trimmed = schedule.Trim();
        if (DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsedOffset))
        {
            return parsedOffset;
        }

        if (DateTime.TryParse(
                trimmed,
                CultureInfo.GetCultureInfo("en-US"),
                DateTimeStyles.AllowWhiteSpaces,
                out var parsedEnUs))
        {
            var unspecified = DateTime.SpecifyKind(parsedEnUs, DateTimeKind.Unspecified);
            return new DateTimeOffset(unspecified, TimeZoneInfo.Local.GetUtcOffset(unspecified));
        }

        if (DateTime.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var parsedInvariant))
        {
            var unspecified = DateTime.SpecifyKind(parsedInvariant, DateTimeKind.Unspecified);
            return new DateTimeOffset(unspecified, TimeZoneInfo.Local.GetUtcOffset(unspecified));
        }

        var weekdayMatch = WeekdayTimePattern().Match(trimmed);
        if (weekdayMatch.Success &&
            int.TryParse(weekdayMatch.Groups[2].Value, out var hour) &&
            int.TryParse(weekdayMatch.Groups[3].Value, out var minute) &&
            TryResolveWeekdayIndex(weekdayMatch.Groups[1].Value, out var weekdayIndex))
        {
            var reference = referenceUtc == default ? DateTimeOffset.UtcNow : referenceUtc;
            var localReference = reference.ToLocalTime();
            var localDate = localReference.Date;
            var daysUntil = (weekdayIndex - (int)localDate.DayOfWeek + 7) % 7;
            if (daysUntil == 0)
            {
                daysUntil = 7;
            }

            var target = localDate.AddDays(daysUntil).AddHours(hour).AddMinutes(minute);
            return new DateTimeOffset(target, TimeZoneInfo.Local.GetUtcOffset(target));
        }

        return null;
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
