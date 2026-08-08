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
}
