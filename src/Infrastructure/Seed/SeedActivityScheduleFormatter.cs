using System.Globalization;

namespace Cohestra.Infrastructure.Seed;

internal static class SeedActivityScheduleFormatter
{
    /// <summary>
    /// Matches web <c>formatScheduleForStorage</c> output for calendar parsing.
    /// </summary>
    internal static string FormatSaturdaySchedule(DateTimeOffset anchor, int weekOrdinal, int hour = 10, int minute = 0)
    {
        var target = NextOrSameSaturday(anchor.UtcDateTime.Date)
            .AddDays((weekOrdinal - 1) * 7)
            .AddHours(hour)
            .AddMinutes(minute);

        return target.ToString("ddd, MMM d, yyyy, h:mm tt", CultureInfo.InvariantCulture);
    }

    internal static string FormatFromCreatedDaysAgo(DateTimeOffset anchor, int createdDaysAgo, int hour = 10, int minute = 0)
    {
        var weekOrdinal = Math.Max(1, (createdDaysAgo / 7) + 1);
        return FormatSaturdaySchedule(anchor, weekOrdinal, hour, minute);
    }

    private static DateTime NextOrSameSaturday(DateTime date)
    {
        var daysUntilSaturday = ((int)DayOfWeek.Saturday - (int)date.DayOfWeek + 7) % 7;
        return date.AddDays(daysUntilSaturday);
    }
}
