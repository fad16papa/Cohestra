using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class RegistrationPeriodTests
{
    [Fact]
    public void GetMonthStartUtc_UsesUtcByDefault()
    {
        var utcNow = new DateTimeOffset(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
        var monthStart = RegistrationPeriod.GetMonthStartUtc(utcNow, null);

        Assert.Equal(new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero), monthStart);
    }

    [Fact]
    public void GetMonthStartUtc_SingaporeTimeZone_StartsEarlierInUtc()
    {
        // 2026-08-01 00:30 SGT = 2026-07-31 16:30 UTC
        var utcNow = new DateTimeOffset(2026, 7, 31, 16, 30, 0, TimeSpan.Zero);
        var monthStart = RegistrationPeriod.GetMonthStartUtc(utcNow, "Asia/Singapore");

        Assert.Equal(new DateTimeOffset(2026, 7, 31, 16, 0, 0, TimeSpan.Zero), monthStart);
    }

    [Fact]
    public void GetNextMonthStartUtc_Singapore_ReturnsFirstDayOfNextLocalMonth()
    {
        var utcNow = new DateTimeOffset(2026, 8, 15, 10, 0, 0, TimeSpan.Zero);
        var nextStart = RegistrationPeriod.GetNextMonthStartUtc(utcNow, "Asia/Singapore");

        Assert.Equal(new DateTimeOffset(2026, 8, 31, 16, 0, 0, TimeSpan.Zero), nextStart);
    }

    [Fact]
    public void RegistrationTimeZoneSupport_RejectsUnknownId()
    {
        var error = RegistrationTimeZoneSupport.Validate("Not/A/Real/Zone");
        Assert.NotNull(error);
    }

    [Fact]
    public void RegistrationTimeZoneSupport_NormalizesBlankToUtc()
    {
        Assert.Equal(RegistrationTimeZoneDefaults.Utc, RegistrationTimeZoneSupport.Normalize("   "));
    }
}
