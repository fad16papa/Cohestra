using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformAuditSearchService(CohestraDbContext dbContext) : IPlatformAuditSearchService
{
    private const int MaxPage = 10_000;

    public async Task<PlatformAuditSearchResult> SearchAsync(
        PlatformAuditSearchQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormalize(query, out var normalized, out var error))
        {
            return new PlatformAuditSearchResult(false, null, error);
        }

        var rows = ApplyFilters(dbContext.PlatformAuditLogs.AsNoTracking(), normalized);
        var totalCount = await rows.CountAsync(cancellationToken);
        var items = await Project(rows)
            .Skip((normalized.Page - 1) * normalized.PageSize)
            .Take(normalized.PageSize)
            .ToListAsync(cancellationToken);

        return new PlatformAuditSearchResult(
            true,
            new PlatformAuditListResponse(items, normalized.Page, normalized.PageSize, totalCount),
            null);
    }

    public async Task<PlatformAuditExportResult> ExportAsync(
        PlatformAuditSearchQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormalize(query, out var normalized, out var error))
        {
            return new PlatformAuditExportResult(false, null, null, error);
        }

        var rows = ApplyFilters(dbContext.PlatformAuditLogs.AsNoTracking(), normalized);
        var items = await Project(rows)
            .Take(PlatformAuditSearchLimits.MaxExportRows + 1)
            .ToListAsync(cancellationToken);

        if (items.Count > PlatformAuditSearchLimits.MaxExportRows)
        {
            return new PlatformAuditExportResult(
                false,
                null,
                null,
                $"Export exceeds {PlatformAuditSearchLimits.MaxExportRows} rows. Narrow the filters.");
        }

        var observedAt = DateTimeOffset.UtcNow;
        return new PlatformAuditExportResult(
            true,
            PlatformAuditCsv.WriteUtf8(items),
            PlatformAuditCsv.FileNameUtc(observedAt),
            null);
    }

    internal static bool TryNormalize(
        PlatformAuditSearchQuery query,
        out NormalizedAuditQuery normalized,
        out string error)
    {
        normalized = default;
        error = string.Empty;

        PlatformAuditAction? action = null;
        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var rawAction = query.Action.Trim();
            // Name-only: Enum.TryParse accepts "0"/"1" aliases; those are not current enum names.
            if (!Enum.TryParse<PlatformAuditAction>(rawAction, ignoreCase: true, out var parsed)
                || !Enum.IsDefined(parsed)
                || !string.Equals(parsed.ToString(), rawAction, StringComparison.OrdinalIgnoreCase))
            {
                error = "action must be a current PlatformAuditAction value.";
                return false;
            }

            action = parsed;
        }

        string? actorEmail = null;
        if (!string.IsNullOrWhiteSpace(query.ActorEmail))
        {
            actorEmail = query.ActorEmail.Trim().ToLowerInvariant();
        }

        if (query.From is { } from && query.To is { } to && from > to)
        {
            error = "from must be less than or equal to to. Date filters apply to CreatedAt (UTC, inclusive).";
            return false;
        }

        var pageSize = query.PageSize < 1
            ? PlatformAuditSearchLimits.DefaultPageSize
            : Math.Min(query.PageSize, PlatformAuditSearchLimits.MaxPageSize);
        var page = query.Page < 1 ? 1 : Math.Min(query.Page, MaxPage);
        var maxSafePage = Math.Max(1, (int.MaxValue / pageSize) - 1);
        if (page > maxSafePage)
        {
            page = maxSafePage;
        }

        normalized = new NormalizedAuditQuery(
            action,
            query.TenantId,
            actorEmail,
            query.From,
            query.To,
            page,
            pageSize);
        return true;
    }

    internal static IQueryable<PlatformAuditLog> ApplyFilters(
        IQueryable<PlatformAuditLog> rows,
        NormalizedAuditQuery normalized)
    {
        if (normalized.Action is { } action)
        {
            rows = rows.Where(audit => audit.Action == action);
        }

        if (normalized.TenantId is { } tenantId)
        {
            rows = rows.Where(audit => audit.TenantId == tenantId);
        }

        if (normalized.ActorEmail is { } actorEmail)
        {
            rows = rows.Where(audit =>
                audit.ActorEmail != null && audit.ActorEmail.ToLower() == actorEmail);
        }

        if (normalized.From is { } from)
        {
            rows = rows.Where(audit => audit.CreatedAt >= from);
        }

        if (normalized.To is { } to)
        {
            rows = rows.Where(audit => audit.CreatedAt <= to);
        }

        return rows
            .OrderByDescending(audit => audit.CreatedAt)
            .ThenByDescending(audit => audit.Id);
    }

    private static IQueryable<PlatformAuditEntryResponse> Project(IQueryable<PlatformAuditLog> rows) =>
        rows.Select(audit => new PlatformAuditEntryResponse(
            audit.Id,
            audit.ActorUserId,
            audit.ActorEmail,
            audit.TenantId,
            audit.Action.ToString(),
            audit.Reason,
            audit.CreatedAt));

    internal readonly record struct NormalizedAuditQuery(
        PlatformAuditAction? Action,
        Guid? TenantId,
        string? ActorEmail,
        DateTimeOffset? From,
        DateTimeOffset? To,
        int Page,
        int PageSize);
}
