using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityScheduleExpirationTests
{
    [Fact]
    public void IsPastEventEnd_ReturnsFalseBeforeEndOfEventDay()
    {
        var startsAt = new DateTimeOffset(2026, 8, 20, 10, 0, 0, TimeSpan.Zero);
        var duringEventDay = new DateTimeOffset(2026, 8, 20, 18, 0, 0, TimeSpan.Zero);

        Assert.False(ActivityScheduleExpiration.IsPastEventEnd(
            startsAt,
            "UTC",
            duringEventDay));
    }

    [Fact]
    public void IsPastEventEnd_ReturnsTrueAfterEndOfEventDay()
    {
        var startsAt = new DateTimeOffset(2026, 8, 20, 10, 0, 0, TimeSpan.Zero);
        var nextDay = new DateTimeOffset(2026, 8, 21, 0, 0, 1, TimeSpan.Zero);

        Assert.True(ActivityScheduleExpiration.IsPastEventEnd(
            startsAt,
            "UTC",
            nextDay));
    }

    [Fact]
    public void IsRegistrationOpen_IsFalseForPublishedPastEvent()
    {
        var activity = new Activity
        {
            Status = ActivityStatus.Published,
            ScheduledStartsAt = new DateTimeOffset(2026, 8, 20, 10, 0, 0, TimeSpan.Zero),
            Schedule = "Sat, Aug 20, 2026, 10:00 AM",
        };

        var nextDay = new DateTimeOffset(2026, 8, 21, 1, 0, 0, TimeSpan.Zero);

        Assert.False(ActivityScheduleExpiration.IsRegistrationOpen(activity, "UTC", nextDay));
    }

    [Fact]
    public void TryParseStartsAt_ParsesIsoSchedule()
    {
        var parsed = ActivityScheduleParser.TryParseStartsAt("2026-08-20T10:00:00+00:00");

        Assert.NotNull(parsed);
        Assert.Equal(2026, parsed!.Value.Year);
        Assert.Equal(8, parsed.Value.Month);
        Assert.Equal(20, parsed.Value.Day);
    }
}
