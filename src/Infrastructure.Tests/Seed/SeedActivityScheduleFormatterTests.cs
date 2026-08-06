using Cohestra.Infrastructure.Seed;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class SeedActivityScheduleFormatterTests
{
    [Fact]
    public void FormatSpreadSchedule_DistributesOrdinalsAcrossWindow()
    {
        var anchor = new DateTimeOffset(2026, 8, 5, 12, 0, 0, TimeSpan.Zero);

        var first = SeedActivityScheduleFormatter.FormatSpreadSchedule(anchor, 1, 10);
        var last = SeedActivityScheduleFormatter.FormatSpreadSchedule(anchor, 10, 10);

        Assert.Contains("2026", first);
        Assert.Contains("2026", last);
        Assert.NotEqual(first, last);
    }

    [Fact]
    public void FormatSpreadSchedule_ProducesParseableDisplayFormat()
    {
        var anchor = new DateTimeOffset(2026, 8, 5, 12, 0, 0, TimeSpan.Zero);
        var formatted = SeedActivityScheduleFormatter.FormatSpreadSchedule(anchor, 3, 37);

        Assert.Matches(
            @"^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M$",
            formatted);
    }

    [Fact]
    public void FormatExplicitSchedule_UsesRequestedDayAndTime()
    {
        var day = new DateTime(2026, 8, 13);
        var formatted = SeedActivityScheduleFormatter.FormatExplicitSchedule(day, 13, 30);

        Assert.Equal("Thu, Aug 13, 2026, 1:30 PM", formatted);
    }
}
