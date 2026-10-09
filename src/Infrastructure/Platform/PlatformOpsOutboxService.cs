using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformOpsOutboxService(CohestraDbContext dbContext) : IPlatformOpsOutboxService
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 50;
    private const int MaxPage = 10_000;
    private const int MaxMessageTypeLength = 128;

    public async Task<PlatformOpsOutboxSummaryResponse> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var observedAt = DateTimeOffset.UtcNow;
        var query = dbContext.OutboxMessages.AsNoTracking();

        var statusRows = await query
            .GroupBy(message => message.Status)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var statusCounts = Enum.GetValues<OutboxMessageStatus>()
            .Select(status => new PlatformNamedCount(
                status.ToString(),
                statusRows.FirstOrDefault(row => row.Key == status)?.Count ?? 0))
            .ToList();

        var typeRows = await query
            .GroupBy(message => message.MessageType)
            .Select(group => new { group.Key, Count = group.Count() })
            .OrderBy(row => row.Key)
            .ToListAsync(cancellationToken);

        var typeCounts = typeRows
            .Select(row => new PlatformNamedCount(row.Key, row.Count))
            .ToList();

        return new PlatformOpsOutboxSummaryResponse(
            new PlatformKpi<IReadOnlyList<PlatformNamedCount>>(
                statusCounts,
                PlatformOpsOutboxSources.OutboxMessages,
                observedAt,
                PlatformKpiFreshness.Actual),
            new PlatformKpi<IReadOnlyList<PlatformNamedCount>>(
                typeCounts,
                PlatformOpsOutboxSources.OutboxMessages,
                observedAt,
                PlatformKpiFreshness.Actual));
    }

    public async Task<PlatformOpsOutboxQueryResult> ListAsync(
        PlatformOpsOutboxListQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormalize(query, out var normalized, out var error))
        {
            return new PlatformOpsOutboxQueryResult(false, null, error);
        }

        var rows = dbContext.OutboxMessages.AsNoTracking();

        if (normalized.Status is { } status)
        {
            rows = rows.Where(message => message.Status == status);
        }

        if (normalized.MessageType is { } messageType)
        {
            rows = rows.Where(message => message.MessageType == messageType);
        }

        if (normalized.TenantId is { } tenantId)
        {
            rows = rows.Where(message => message.TenantId == tenantId);
        }

        if (normalized.From is { } from)
        {
            rows = rows.Where(message => message.CreatedAt >= from);
        }

        if (normalized.To is { } to)
        {
            rows = rows.Where(message => message.CreatedAt <= to);
        }

        var totalCount = await rows.CountAsync(cancellationToken);

        var items = await rows
            .OrderByDescending(message => message.CreatedAt)
            .ThenByDescending(message => message.Id)
            .Skip((normalized.Page - 1) * normalized.PageSize)
            .Take(normalized.PageSize)
            .Select(message => new
            {
                message.Id,
                message.TenantId,
                message.MessageType,
                message.Status,
                message.AttemptCount,
                message.CreatedAt,
                message.NextAttemptAt,
                message.ProcessedAt,
                message.ClaimedAt,
                message.DispatchedAt,
                message.LastError,
            })
            .ToListAsync(cancellationToken);

        var mapped = items
            .Select(message => new PlatformOpsOutboxItem(
                message.Id,
                message.TenantId,
                message.MessageType,
                message.Status.ToString(),
                message.AttemptCount,
                message.CreatedAt,
                message.NextAttemptAt,
                message.ProcessedAt,
                message.ClaimedAt,
                message.DispatchedAt,
                PlatformHealthDescriptionSanitizer.Sanitize(message.LastError)))
            .ToList();

        return new PlatformOpsOutboxQueryResult(
            true,
            new PlatformOpsOutboxListResponse(
                mapped,
                normalized.Page,
                normalized.PageSize,
                totalCount),
            null);
    }

    internal static bool TryNormalize(
        PlatformOpsOutboxListQuery query,
        out NormalizedOutboxQuery normalized,
        out string error)
    {
        normalized = default;
        error = string.Empty;

        OutboxMessageStatus? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<OutboxMessageStatus>(query.Status.Trim(), ignoreCase: true, out var parsed)
                || !Enum.IsDefined(parsed))
            {
                error = "status must be one of Pending, Processing, Completed, Failed.";
                return false;
            }

            status = parsed;
        }

        string? messageType = null;
        if (!string.IsNullOrWhiteSpace(query.MessageType))
        {
            messageType = query.MessageType.Trim();
            if (messageType.Length > MaxMessageTypeLength)
            {
                error = $"messageType must be at most {MaxMessageTypeLength} characters.";
                return false;
            }
        }

        if (query.From is { } from && query.To is { } to && from > to)
        {
            error = "from must be less than or equal to to. Date filters apply to CreatedAt (UTC).";
            return false;
        }

        var pageSize = query.PageSize < 1
            ? DefaultPageSize
            : Math.Min(query.PageSize, MaxPageSize);
        var page = query.Page < 1 ? 1 : Math.Min(query.Page, MaxPage);
        var maxSafePage = Math.Max(1, (int.MaxValue / pageSize) - 1);
        if (page > maxSafePage)
        {
            page = maxSafePage;
        }

        normalized = new NormalizedOutboxQuery(
            status,
            messageType,
            query.TenantId,
            query.From,
            query.To,
            page,
            pageSize);
        return true;
    }

    internal readonly record struct NormalizedOutboxQuery(
        OutboxMessageStatus? Status,
        string? MessageType,
        Guid? TenantId,
        DateTimeOffset? From,
        DateTimeOffset? To,
        int Page,
        int PageSize);
}
