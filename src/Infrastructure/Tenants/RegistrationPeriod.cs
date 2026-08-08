namespace Cohestra.Infrastructure.Tenants;

/// <summary>
/// Tenant-scoped registration limit month boundaries (calendar month in tenant timezone).
/// </summary>
public static class RegistrationPeriod
{
    public static DateTimeOffset GetMonthStartUtc(DateTimeOffset utcNow, string? timeZoneId)
    {
        var timeZone = RegistrationTimeZoneSupport.Resolve(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(utcNow, timeZone);
        var localMonthStart = new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var utcMonthStart = TimeZoneInfo.ConvertTimeToUtc(localMonthStart, timeZone);
        return new DateTimeOffset(utcMonthStart, TimeSpan.Zero);
    }

    public static DateTimeOffset GetNextMonthStartUtc(DateTimeOffset utcNow, string? timeZoneId)
    {
        var timeZone = RegistrationTimeZoneSupport.Resolve(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(utcNow, timeZone);
        var nextLocalMonth = localNow.Month == 12
            ? new DateTime(localNow.Year + 1, 1, 1, 0, 0, 0, DateTimeKind.Unspecified)
            : new DateTime(localNow.Year, localNow.Month + 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var utcNextMonthStart = TimeZoneInfo.ConvertTimeToUtc(nextLocalMonth, timeZone);
        return new DateTimeOffset(utcNextMonthStart, TimeSpan.Zero);
    }

    public static DateTimeOffset GetStartOfTomorrowUtc(DateTimeOffset utcNow, string? timeZoneId)
    {
        var timeZone = RegistrationTimeZoneSupport.Resolve(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(utcNow, timeZone);
        var tomorrowLocal = localNow.Date.AddDays(1);
        var utcTomorrow = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(tomorrowLocal, DateTimeKind.Unspecified),
            timeZone);
        return new DateTimeOffset(utcTomorrow, TimeSpan.Zero);
    }

    public static DateTimeOffset? ParseLocalDateToUtc(string? dateOnly, string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(dateOnly))
        {
            return null;
        }

        if (!DateOnly.TryParse(dateOnly.Trim(), out var parsed))
        {
            return null;
        }

        var timeZone = RegistrationTimeZoneSupport.Resolve(timeZoneId);
        var localDateTime = new DateTime(
            parsed.Year,
            parsed.Month,
            parsed.Day,
            0,
            0,
            0,
            DateTimeKind.Unspecified);
        var utc = TimeZoneInfo.ConvertTimeToUtc(localDateTime, timeZone);
        return new DateTimeOffset(utc, TimeSpan.Zero);
    }
}
