using System.Globalization;

namespace Cohestra.Infrastructure.Seed;

internal static class SeedActivityScheduleFormatter
{
    private const int WindowStartOffsetDays = -14;
    private const int WindowDays = 98;
    private const int BaseHour = 9;

    /// <summary>
    /// Matches web <c>formatScheduleForStorage</c> output for calendar parsing.
    /// </summary>
    internal static string FormatSaturdaySchedule(DateTimeOffset anchor, int weekOrdinal, int hour = 10, int minute = 0)
    {
        var target = NextOrSameSaturday(anchor.UtcDateTime.Date)
            .AddDays((weekOrdinal - 1) * 7)
            .AddHours(hour)
            .AddMinutes(minute);

        return FormatDisplayDateTime(target);
    }

    internal static string FormatFromCreatedDaysAgo(DateTimeOffset anchor, int createdDaysAgo, int hour = 10, int minute = 0)
    {
        var weekOrdinal = Math.Max(1, (createdDaysAgo / 7) + 1);
        return FormatSaturdaySchedule(anchor, weekOrdinal, hour, minute);
    }

    /// <summary>
    /// Spread activities across a ~14-day past / 12-week future window for calendar testing.
    /// </summary>
    internal static string FormatSpreadSchedule(
        DateTimeOffset anchor,
        int ordinal,
        int totalCount,
        int minuteOffset = 0)
    {
        var safeTotal = Math.Max(totalCount, 1);
        var safeOrdinal = Math.Clamp(ordinal, 1, safeTotal);

        var windowStart = anchor.UtcDateTime.Date.AddDays(WindowStartOffsetDays);
        var daySlot = safeTotal <= 1
            ? WindowDays / 2
            : (safeOrdinal - 1) * (WindowDays - 1) / (safeTotal - 1);

        var hour = BaseHour + ((safeOrdinal - 1) % 6) * 2;
        var minute = minuteOffset % 60;

        var target = windowStart
            .AddDays(daySlot)
            .AddHours(hour)
            .AddMinutes(minute);

        return FormatDisplayDateTime(target);
    }

    private static string FormatDisplayDateTime(DateTime target) =>
        target.ToString("ddd, MMM d, yyyy, h:mm tt", CultureInfo.InvariantCulture);

    private static DateTime NextOrSameSaturday(DateTime date)
    {
        var daysUntilSaturday = ((int)DayOfWeek.Saturday - (int)date.DayOfWeek + 7) % 7;
        return date.AddDays(daysUntilSaturday);
    }
}
