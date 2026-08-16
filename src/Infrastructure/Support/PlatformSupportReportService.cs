using System.Globalization;
using System.Text;
using Cohestra.Application.Support;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Support;

public sealed class PlatformSupportReportService(CohestraDbContext dbContext) : IPlatformSupportReportService
{
    private const int TopTenantLimit = 10;

    public async Task<PlatformSupportReportResponse> GetReportAsync(
        PlatformSupportReportQuery query,
        CancellationToken cancellationToken = default)
    {
        var normalizedPreset = query.Preset.Trim().ToLowerInvariant();
        var computedAt = DateTimeOffset.UtcNow;
        var (startAt, endAt) = ResolvePeriod(normalizedPreset, query, computedAt);

        var issues = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var openedInPeriod = issues.Count(
            issue => issue.CreatedAt >= startAt && issue.CreatedAt <= endAt);

        var resolvedOrClosedInPeriod = issues.Count(
            issue =>
                issue.UpdatedAt >= startAt
                && issue.UpdatedAt <= endAt
                && (issue.Status == SupportIssueStatus.Resolved
                    || issue.Status == SupportIssueStatus.Closed));

        var stillOpen = issues.Count(
            issue =>
                issue.Status == SupportIssueStatus.Open
                || issue.Status == SupportIssueStatus.InProgress
                || issue.Status == SupportIssueStatus.WaitingOnOperator);

        var countsByStatus = issues
            .GroupBy(issue => issue.Status)
            .Select(group => new PlatformSupportStatusCountResponse(
                group.Key.ToString(),
                group.Count()))
            .OrderBy(item => item.Status)
            .ToList();

        var topTenants = issues
            .Where(issue => issue.CreatedAt >= startAt && issue.CreatedAt <= endAt)
            .GroupBy(issue => new { issue.TenantSlug, issue.TenantName })
            .Select(group => new PlatformSupportTenantVolumeResponse(
                group.Key.TenantSlug,
                group.Key.TenantName,
                group.Count()))
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.TenantSlug)
            .Take(TopTenantLimit)
            .ToList();

        var dailyOpenedTrend = issues
            .Where(issue => issue.CreatedAt >= startAt && issue.CreatedAt <= endAt)
            .GroupBy(issue => DateOnly.FromDateTime(issue.CreatedAt.UtcDateTime))
            .Select(group => new PlatformSupportTrendPointResponse(
                group.Key,
                group.Count()))
            .OrderBy(item => item.Date)
            .ToList();

        return new PlatformSupportReportResponse(
            new PlatformSupportReportPeriodResponse(
                normalizedPreset,
                startAt,
                endAt,
                computedAt),
            openedInPeriod,
            resolvedOrClosedInPeriod,
            stillOpen,
            countsByStatus,
            topTenants,
            dailyOpenedTrend);
    }

    public async Task<(byte[] Content, string FileName)> ExportCsvAsync(
        PlatformSupportReportQuery query,
        CancellationToken cancellationToken = default)
    {
        var normalizedPreset = query.Preset.Trim().ToLowerInvariant();
        var computedAt = DateTimeOffset.UtcNow;
        var (startAt, endAt) = ResolvePeriod(normalizedPreset, query, computedAt);

        var rows = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Where(issue => issue.CreatedAt >= startAt && issue.CreatedAt <= endAt)
            .OrderByDescending(issue => issue.CreatedAt)
            .Select(issue => new SupportCsvRow(
                issue.IssueNumber,
                issue.TenantSlug,
                issue.TenantName,
                issue.OperatorEmail,
                issue.Subject,
                issue.Status.ToString(),
                issue.CreatedAt,
                issue.UpdatedAt))
            .ToListAsync(cancellationToken);

        var content = BuildCsvContent(rows);
        var fileName = $"support-report-{normalizedPreset}-{computedAt.UtcDateTime:yyyy-MM-dd}.csv";
        return (content, fileName);
    }

    private static byte[] BuildCsvContent(IReadOnlyList<SupportCsvRow> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine(
            "IssueNumber,TenantSlug,TenantName,OperatorEmail,Subject,Status,CreatedAt,UpdatedAt");

        foreach (var row in rows)
        {
            builder.Append(CsvEscape(row.IssueNumber));
            builder.Append(',');
            builder.Append(CsvEscape(row.TenantSlug));
            builder.Append(',');
            builder.Append(CsvEscape(row.TenantName));
            builder.Append(',');
            builder.Append(CsvEscape(row.OperatorEmail));
            builder.Append(',');
            builder.Append(CsvEscape(row.Subject));
            builder.Append(',');
            builder.Append(CsvEscape(row.Status));
            builder.Append(',');
            builder.Append(CsvEscape(row.CreatedAt.ToString("O", CultureInfo.InvariantCulture)));
            builder.Append(',');
            builder.AppendLine(CsvEscape(row.UpdatedAt.ToString("O", CultureInfo.InvariantCulture)));
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(builder.ToString())).ToArray();
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
        }

        return value;
    }

    private static (DateTimeOffset StartAt, DateTimeOffset EndAt) ResolvePeriod(
        string preset,
        PlatformSupportReportQuery query,
        DateTimeOffset now)
    {
        return preset switch
        {
            "weekly" => (StartOfUtcWeek(now), now),
            "monthly" => (StartOfUtcMonth(now), now),
            "custom" => ResolveCustomPeriod(query),
            _ => throw new ArgumentException("Preset must be weekly, monthly, or custom."),
        };
    }

    private static (DateTimeOffset StartAt, DateTimeOffset EndAt) ResolveCustomPeriod(
        PlatformSupportReportQuery query)
    {
        if (query.From is null || query.To is null)
        {
            throw new ArgumentException("Custom preset requires from and to dates.");
        }

        if (query.From > query.To)
        {
            throw new ArgumentException("From date must be on or before to date.");
        }

        var startAt = new DateTimeOffset(
            query.From.Value.ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);
        var endAt = new DateTimeOffset(
            query.To.Value.ToDateTime(new TimeOnly(23, 59, 59)),
            TimeSpan.Zero);

        return (startAt, endAt);
    }

    private static DateTimeOffset StartOfUtcWeek(DateTimeOffset now)
    {
        var utcDate = now.UtcDateTime.Date;
        var daysSinceMonday = ((int)utcDate.DayOfWeek + 6) % 7;
        return new DateTimeOffset(utcDate.AddDays(-daysSinceMonday), TimeSpan.Zero);
    }

    private static DateTimeOffset StartOfUtcMonth(DateTimeOffset now) =>
        new(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

    private sealed record SupportCsvRow(
        string IssueNumber,
        string TenantSlug,
        string TenantName,
        string OperatorEmail,
        string Subject,
        string Status,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);
}
