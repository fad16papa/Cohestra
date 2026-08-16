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
            CreateIssue(tenantA, "SUP20260816000001", "alpha", "Alpha", SupportIssueStatus.Open, weekStart.AddHours(1)),
            CreateIssue(tenantB, "SUP20260816000002", "beta", "Beta", SupportIssueStatus.Resolved, weekStart.AddHours(2)),
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
                weekStart.AddHours(3)));
        await db.SaveChangesAsync();

        var service = new PlatformSupportReportService(db);
        var export = await service.ExportCsvAsync(new PlatformSupportReportQuery("weekly"));

        var text = System.Text.Encoding.UTF8.GetString(export.Content);
        Assert.Contains("IssueNumber,TenantSlug", text);
        Assert.Contains("SUP20260816000004", text);
        Assert.Contains("delta", text);
        Assert.DoesNotContain("screenshot", text, StringComparison.OrdinalIgnoreCase);
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

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
