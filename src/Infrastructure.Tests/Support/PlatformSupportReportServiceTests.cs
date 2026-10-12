using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Support;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class PlatformSupportReportServiceTests
{
    [Fact]
    public async Task GetReportAsync_returns_zero_states_for_empty_period()
    {
        await using var db = CreateDb();
        var service = new PlatformSupportReportService(db);

        var report = await service.GetReportAsync(new PlatformSupportReportQuery("weekly"));

        Assert.Equal(0, report.OpenedInPeriod);
        Assert.Equal(0, report.ResolvedOrClosedInPeriod);
        Assert.Equal(0, report.StillOpen);
        Assert.Empty(report.TopTenants);
        Assert.Empty(report.DailyOpenedTrend);
    }

    [Fact]
    public async Task GetReportAsync_aggregates_opened_resolved_and_still_open()
    {
        await using var db = CreateDb();
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var weekStart = StartOfUtcWeek(now);

        db.SupportIssues.AddRange(
            CreateIssue(tenantA, "SUP20260816000001", "alpha", "Alpha", SupportIssueStatus.Open, InPeriodCreatedAt(weekStart, now, 1)),
            CreateIssue(tenantB, "SUP20260816000002", "beta", "Beta", SupportIssueStatus.Resolved, InPeriodCreatedAt(weekStart, now, 2)),
            CreateIssue(tenantA, "SUP20260816000003", "alpha", "Alpha", SupportIssueStatus.Closed, weekStart.AddDays(-10)));
        await db.SaveChangesAsync();

        var service = new PlatformSupportReportService(db);
        var report = await service.GetReportAsync(new PlatformSupportReportQuery("weekly"));

        Assert.Equal(2, report.OpenedInPeriod);
        Assert.Equal(1, report.ResolvedOrClosedInPeriod);
        Assert.Equal(1, report.StillOpen);
        Assert.Equal(2, report.TopTenants.Count);
        Assert.Equal("alpha", report.TopTenants[0].TenantSlug);
    }

    [Fact]
    public async Task ExportCsvAsync_includes_issue_rows_without_binary_data()
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var weekStart = StartOfUtcWeek(now);

        db.SupportIssues.Add(
            CreateIssue(
                tenantId,
                "SUP20260816000004",
                "delta",
                "Delta",
                SupportIssueStatus.Open,
                InPeriodCreatedAt(weekStart, now, 3)));
        await db.SaveChangesAsync();

        var service = new PlatformSupportReportService(db);
        var export = await service.ExportCsvAsync(new PlatformSupportReportQuery("weekly"));

        var text = System.Text.Encoding.UTF8.GetString(export.Content);
        Assert.Contains("IssueNumber,TenantSlug", text);
        Assert.Contains("SUP20260816000004", text);
        Assert.Contains("delta", text);
        Assert.DoesNotContain("screenshot", text, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(59)]
    [InlineData(60)]
    [InlineData(119)]
    [InlineData(120)]
    [InlineData(179)]
    [InlineData(180)]
    public void InPeriodCreatedAt_stays_inside_weekly_window_on_early_monday_utc(int minutesAfterMonday)
    {
        // Fixed Monday 00:00 UTC — not UtcNow — so this proof is not wall-clock sensitive.
        var weekStart = new DateTimeOffset(2026, 10, 12, 0, 0, 0, TimeSpan.Zero);
        Assert.Equal(DayOfWeek.Monday, weekStart.UtcDateTime.DayOfWeek);

        var now = weekStart.AddMinutes(minutesAfterMonday);
        foreach (var sequence in new[] { 1, 2, 3 })
        {
            var createdAt = InPeriodCreatedAt(weekStart, now, sequence);
            Assert.True(createdAt >= weekStart, $"sequence {sequence} is before weekStart");
            Assert.True(createdAt <= now, $"sequence {sequence} is after synthetic now");
        }
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void Former_hour_offsets_are_future_during_early_monday_utc(int hoursAfterMonday)
    {
        var weekStart = new DateTimeOffset(2026, 10, 12, 0, 0, 0, TimeSpan.Zero);
        var now = weekStart.AddMinutes(30);

        var former = weekStart.AddHours(hoursAfterMonday);
        Assert.True(former > now);

        var corrected = InPeriodCreatedAt(weekStart, now, hoursAfterMonday);
        Assert.True(corrected >= weekStart);
        Assert.True(corrected <= now);
    }

    [Fact]
    public void InPeriodCreatedAt_keeps_requested_offsets_once_elapsed_time_covers_them()
    {
        var weekStart = new DateTimeOffset(2026, 10, 12, 0, 0, 0, TimeSpan.Zero);
        var now = weekStart.AddHours(10);

        Assert.Equal(weekStart.AddMinutes(1), InPeriodCreatedAt(weekStart, now, 1));
        Assert.Equal(weekStart.AddMinutes(2), InPeriodCreatedAt(weekStart, now, 2));
        Assert.Equal(weekStart.AddMinutes(3), InPeriodCreatedAt(weekStart, now, 3));
    }

    private static SupportIssue CreateIssue(
        Guid tenantId,
        string issueNumber,
        string slug,
        string tenantName,
        SupportIssueStatus status,
        DateTimeOffset createdAt) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            IssueNumber = issueNumber,
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Help",
            Description = "Something broke",
            Status = status,
            OperatorEmail = "operator@example.com",
            OperatorDisplayName = "Operator",
            TenantSlug = slug,
            TenantName = tenantName,
            Plan = TenantPlan.Basic,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

    private static DateTimeOffset StartOfUtcWeek(DateTimeOffset now)
    {
        var utcDate = now.UtcDateTime.Date;
        var daysSinceMonday = ((int)utcDate.DayOfWeek + 6) % 7;
        return new DateTimeOffset(utcDate.AddDays(-daysSinceMonday), TimeSpan.Zero);
    }

    /// <summary>
    /// Timestamp guaranteed to sit inside the weekly window [weekStart, now].
    /// Candidates that would land after <paramref name="now"/> clamp to <paramref name="now"/>,
    /// so early-Monday UTC (00:00–03:00) cannot seed future fixtures.
    /// </summary>
    private static DateTimeOffset InPeriodCreatedAt(DateTimeOffset weekStart, DateTimeOffset now, int sequence)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(sequence, 1);
        if (now < weekStart)
        {
            throw new ArgumentOutOfRangeException(nameof(now), now, "now must be on or after weekStart.");
        }

        var candidate = weekStart.AddMinutes(sequence);
        return candidate <= now ? candidate : now;
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
