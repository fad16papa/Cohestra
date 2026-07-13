using System.Globalization;
using System.Text;
using LeadGenerationCrm.Application.Reports;
using LeadGenerationCrm.Contracts.Reports;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Reports;

public sealed class ReportService(LeadGenerationCrmDbContext dbContext) : IReportService
{
    public async Task<ReportResponse> GetReportAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default)
    {
        var normalizedPreset = query.Preset.Trim().ToLowerInvariant();
        var computedAt = DateTimeOffset.UtcNow;
        var (startAt, endAt) = ResolvePeriod(normalizedPreset, query, computedAt);

        var registrationsInPeriod = BuildFilteredRegistrationsQuery(
            query,
            startAt,
            endAt);
        var registrationCount = await registrationsInPeriod.CountAsync(cancellationToken);

        var activitiesHosted = await registrationsInPeriod
            .Select(registration => registration.ActivityId)
            .Distinct()
            .CountAsync(cancellationToken);

        var cohortClientIds = registrationsInPeriod
            .Select(registration => registration.ClientId)
            .Distinct();

        var newLeads = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    cohortClientIds.Contains(client.Id) &&
                    client.CreatedAt >= startAt &&
                    client.CreatedAt <= endAt,
                cancellationToken);

        var totalLeadsAtEnd = await cohortClientIds.CountAsync(cancellationToken);

        var totalLeadsBeforePeriod = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    cohortClientIds.Contains(client.Id) &&
                    client.CreatedAt < startAt,
                cancellationToken);

        var inactiveClients = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    cohortClientIds.Contains(client.Id) &&
                    client.LeadStatus == LeadStatus.Inactive,
                cancellationToken);

        var repeatParticipants = await registrationsInPeriod
            .GroupBy(registration => registration.ClientId)
            .Where(group => group.Count() >= 2)
            .CountAsync(cancellationToken);

        var followUpStatus = await BuildFollowUpStatusAsync(
            registrationsInPeriod,
            cancellationToken);

        var activityRanking = await BuildActivityRankingAsync(
            registrationsInPeriod,
            cancellationToken);

        var communityRanking = await BuildCommunityRankingAsync(
            registrationsInPeriod,
            cancellationToken);

        var campaignResults = await BuildCampaignResultsAsync(startAt, endAt, cancellationToken);

        return new ReportResponse(
            new ReportPeriodResponse(normalizedPreset, startAt, endAt, computedAt),
            activitiesHosted,
            registrationCount,
            newLeads,
            followUpStatus,
            activityRanking,
            new ReportLeadGrowthResponse(newLeads, totalLeadsAtEnd, totalLeadsBeforePeriod),
            communityRanking,
            repeatParticipants,
            inactiveClients,
            campaignResults);
    }

    private async Task<ReportCampaignResultsResponse> BuildCampaignResultsAsync(
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        CancellationToken cancellationToken)
    {
        var campaignsInPeriod = dbContext.Campaigns
            .AsNoTracking()
            .Where(campaign => campaign.SentAt >= startAt && campaign.SentAt <= endAt);

        var campaignsSent = await campaignsInPeriod.CountAsync(cancellationToken);
        if (campaignsSent == 0)
        {
            return new ReportCampaignResultsResponse(true, 0, 0);
        }

        var campaignsFailed = await campaignsInPeriod
            .Where(campaign => campaign.FailedCount > 0)
            .CountAsync(cancellationToken);

        return new ReportCampaignResultsResponse(true, campaignsSent, campaignsFailed);
    }

    public async Task<ReportCsvExportResponse> ExportReportCsvAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default)
    {
        var report = await GetReportAsync(query, cancellationToken);

        var normalizedPreset = query.Preset.Trim().ToLowerInvariant();
        var computedAt = report.Period.ComputedAt;
        var startAt = report.Period.StartAt;
        var endAt = report.Period.EndAt;

        var registrationRows = await BuildFilteredRegistrationsQuery(query, startAt, endAt)
            .OrderByDescending(registration => registration.CreatedAt)
            .Select(registration => new ReportCsvRegistrationRow(
                registration.RegistrationNumber,
                registration.CreatedAt,
                registration.Client.FullName,
                registration.Client.Email,
                registration.Client.Phone,
                registration.Client.LeadStatus,
                registration.Client.ReferralSource,
                registration.Activity.Name,
                registration.Activity.CommunityLabel))
            .ToListAsync(cancellationToken);

        var content = BuildCsvContent(report, registrationRows);
        var fileName =
            $"report-{normalizedPreset}-{computedAt.UtcDateTime:yyyy-MM-dd}.csv";

        return new ReportCsvExportResponse(content, fileName, registrationRows.Count);
    }

    private IQueryable<Domain.Registrations.Registration> BuildFilteredRegistrationsQuery(
        ReportQuery query,
        DateTimeOffset startAt,
        DateTimeOffset endAt)
    {
        return ApplyRegistrationFilters(
            dbContext.Registrations
                .AsNoTracking()
                .Where(registration =>
                    registration.CreatedAt >= startAt &&
                    registration.CreatedAt <= endAt),
            query);
    }

    private static byte[] BuildCsvContent(
        ReportResponse report,
        IReadOnlyList<ReportCsvRegistrationRow> registrationRows)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Metric,Value");
        builder.AppendLine($"Preset,{EscapeCsvField(report.Period.Preset)}");
        builder.AppendLine(
            $"Period Start,{EscapeCsvField(FormatTimestamp(report.Period.StartAt))}");
        builder.AppendLine(
            $"Period End,{EscapeCsvField(FormatTimestamp(report.Period.EndAt))}");
        builder.AppendLine($"Registrations,{registrationRows.Count}");
        builder.AppendLine($"New Leads,{report.NewLeads}");
        builder.AppendLine($"Activities Hosted,{report.ActivitiesHosted}");
        builder.AppendLine(
            $"Follow-up Coverage,{report.FollowUpStatus.CoveragePercent.ToString(CultureInfo.InvariantCulture)}%");
        builder.AppendLine($"Repeat Participants,{report.RepeatParticipants}");
        builder.AppendLine($"Inactive Clients In Cohort,{report.InactiveClients}");
        builder.AppendLine();

        builder.AppendLine(
            "Registration ID,Submitted At,Client Name,Email,Phone,Lead Status,Referral Source,Activity,Community");

        foreach (var row in registrationRows)
        {
            builder.AppendLine(string.Join(',', new[]
            {
                EscapeCsvField(row.RegistrationNumber),
                EscapeCsvField(FormatTimestamp(row.SubmittedAt)),
                EscapeCsvField(row.ClientFullName),
                EscapeCsvField(row.Email),
                EscapeCsvField(row.Phone),
                EscapeCsvField(FormatLeadStatus(row.LeadStatus)),
                EscapeCsvField(row.ReferralSource),
                EscapeCsvField(row.ActivityName),
                EscapeCsvField(row.CommunityLabel),
            }));
        }

        return Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(builder.ToString()))
            .ToArray();
    }

    private static string FormatTimestamp(DateTimeOffset value) =>
        value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    private static string FormatLeadStatus(LeadStatus leadStatus) =>
        leadStatus.ToString().ToLowerInvariant();

    private static string EscapeCsvField(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        if (value.Contains('"') ||
            value.Contains(',') ||
            value.Contains('\n') ||
            value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
        }

        return value;
    }

    private sealed record ReportCsvRegistrationRow(
        string RegistrationNumber,
        DateTimeOffset SubmittedAt,
        string ClientFullName,
        string? Email,
        string? Phone,
        LeadStatus LeadStatus,
        string? ReferralSource,
        string ActivityName,
        string CommunityLabel);
    private static IQueryable<Domain.Registrations.Registration> ApplyRegistrationFilters(
        IQueryable<Domain.Registrations.Registration> query,
        ReportQuery filters)
    {
        if (filters.ActivityId is Guid activityId)
        {
            query = query.Where(registration => registration.ActivityId == activityId);
        }

        if (!string.IsNullOrWhiteSpace(filters.Community))
        {
            var community = filters.Community.Trim();
            query = query.Where(registration => registration.Activity.CommunityLabel == community);
        }

        if (!string.IsNullOrWhiteSpace(filters.LeadStatus) &&
            TryParseLeadStatus(filters.LeadStatus, out var leadStatus))
        {
            query = query.Where(registration => registration.Client.LeadStatus == leadStatus);
        }

        if (!string.IsNullOrWhiteSpace(filters.ReferralSource))
        {
            var referralSource = filters.ReferralSource.Trim();
            query = query.Where(registration => registration.Client.ReferralSource == referralSource);
        }

        return query;
    }

    private static bool TryParseLeadStatus(string value, out LeadStatus leadStatus)
    {
        leadStatus = LeadStatus.New;

        if (!Enum.TryParse(value.Trim(), ignoreCase: true, out leadStatus))
        {
            return false;
        }

        return Enum.IsDefined(leadStatus);
    }

    private static (DateTimeOffset StartAt, DateTimeOffset EndAt) ResolvePeriod(
        string preset,
        ReportQuery query,
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
        ReportQuery query)
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

    private async Task<ReportFollowUpStatusResponse> BuildFollowUpStatusAsync(
        IQueryable<Domain.Registrations.Registration> registrationsInPeriod,
        CancellationToken cancellationToken)
    {
        var cohortClientIds = registrationsInPeriod
            .Select(registration => registration.ClientId)
            .Distinct();

        var statusCounts = await dbContext.Clients
            .AsNoTracking()
            .Where(client => cohortClientIds.Contains(client.Id))
            .GroupBy(client => client.LeadStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var newCount = statusCounts
            .FirstOrDefault(item => item.Status == LeadStatus.New)?.Count ?? 0;
        var contactedCount = statusCounts
            .FirstOrDefault(item => item.Status == LeadStatus.Contacted)?.Count ?? 0;
        var activeCount = statusCounts
            .FirstOrDefault(item => item.Status == LeadStatus.Active)?.Count ?? 0;
        var inactiveCount = statusCounts
            .FirstOrDefault(item => item.Status == LeadStatus.Inactive)?.Count ?? 0;

        var cohortTotal = newCount + contactedCount + activeCount + inactiveCount;

        var followedUpCount = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client =>
                    cohortClientIds.Contains(client.Id) &&
                    (client.LeadStatus != LeadStatus.New ||
                     client.TimelineEvents.Any(timelineEvent =>
                         timelineEvent.EventType == ClientTimelineEventType.EmailCampaignSent ||
                         timelineEvent.EventType == ClientTimelineEventType.WhatsAppInitiated ||
                         timelineEvent.EventType == ClientTimelineEventType.WhatsAppFollowUpRecorded)),
                cancellationToken);

        var coveragePercent = cohortTotal == 0
            ? 0
            : Math.Round(followedUpCount * 100d / cohortTotal, 1);

        return new ReportFollowUpStatusResponse(
            newCount,
            contactedCount,
            activeCount,
            inactiveCount,
            coveragePercent);
    }

    private async Task<IReadOnlyList<ReportActivityRankingItemResponse>> BuildActivityRankingAsync(
        IQueryable<Domain.Registrations.Registration> registrationsInPeriod,
        CancellationToken cancellationToken)
    {
        var registrationCounts = await registrationsInPeriod
            .GroupBy(registration => registration.ActivityId)
            .Select(group => new
            {
                ActivityId = group.Key,
                RegistrationCount = group.Count(),
            })
            .OrderByDescending(item => item.RegistrationCount)
            .ThenBy(item => item.ActivityId)
            .ToListAsync(cancellationToken);

        if (registrationCounts.Count == 0)
        {
            return [];
        }

        var activityIds = registrationCounts.Select(item => item.ActivityId).ToList();

        var activities = await dbContext.Activities
            .AsNoTracking()
            .Where(activity => activityIds.Contains(activity.Id))
            .ToDictionaryAsync(activity => activity.Id, cancellationToken);

        return registrationCounts
            .Where(item => activities.ContainsKey(item.ActivityId))
            .Select(item =>
            {
                var activity = activities[item.ActivityId];
                return new ReportActivityRankingItemResponse(
                    item.ActivityId,
                    activity.Name,
                    activity.CommunityLabel,
                    item.RegistrationCount);
            })
            .ToList();
    }

    private async Task<IReadOnlyList<ReportCommunityRankingItemResponse>> BuildCommunityRankingAsync(
        IQueryable<Domain.Registrations.Registration> registrationsInPeriod,
        CancellationToken cancellationToken)
    {
        var registrationCounts = await registrationsInPeriod
            .GroupBy(registration => registration.ActivityId)
            .Select(group => new
            {
                ActivityId = group.Key,
                RegistrationCount = group.Count(),
            })
            .ToListAsync(cancellationToken);

        if (registrationCounts.Count == 0)
        {
            return [];
        }

        var activityIds = registrationCounts.Select(item => item.ActivityId).ToList();

        var activities = await dbContext.Activities
            .AsNoTracking()
            .Where(activity => activityIds.Contains(activity.Id))
            .Select(activity => new { activity.Id, activity.CommunityLabel })
            .ToListAsync(cancellationToken);

        var communityByActivityId = activities.ToDictionary(
            activity => activity.Id,
            activity => activity.CommunityLabel);

        return registrationCounts
            .Where(item => communityByActivityId.ContainsKey(item.ActivityId))
            .GroupBy(item => communityByActivityId[item.ActivityId])
            .Select(group => new ReportCommunityRankingItemResponse(
                group.Key,
                group.Sum(item => item.RegistrationCount)))
            .OrderByDescending(item => item.RegistrationCount)
            .ThenBy(item => item.CommunityLabel)
            .ToList();
    }
}
