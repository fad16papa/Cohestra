using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformOpsPaddleService(
    CohestraDbContext dbContext,
    IOptions<PaddleSettings> paddleOptions) : IPlatformOpsPaddleService
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 50;
    private const int MaxPage = 10_000;
    private const int MaxEventTypeLength = 128;

    public PlatformOpsPaddleConfigResponse GetConfig()
    {
        var settings = paddleOptions.Value;
        return new PlatformOpsPaddleConfigResponse(
            settings.IsConfigured,
            string.IsNullOrWhiteSpace(settings.Environment) ? "sandbox" : settings.Environment.Trim(),
            settings.AllowLive,
            settings.IsSandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");
    }

    public async Task<PlatformOpsPaddleDeliveryQueryResult> ListDeliveriesAsync(
        PlatformOpsPaddleDeliveryListQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!TryNormalize(query, out var normalized, out var error))
        {
            return new PlatformOpsPaddleDeliveryQueryResult(false, null, error);
        }

        var rows = dbContext.PaddleWebhookDeliveries.AsNoTracking();

        if (normalized.Disposition is { } disposition)
        {
            rows = rows.Where(row => row.Disposition == disposition);
        }

        if (normalized.EventType is { } eventType)
        {
            rows = rows.Where(row => row.EventType == eventType);
        }

        if (normalized.TenantId is { } tenantId)
        {
            rows = rows.Where(row => row.TenantId == tenantId);
        }

        if (normalized.From is { } from)
        {
            rows = rows.Where(row => row.ObservedAt >= from);
        }

        if (normalized.To is { } to)
        {
            rows = rows.Where(row => row.ObservedAt <= to);
        }

        var totalCount = await rows.CountAsync(cancellationToken);
        var items = await rows
            .OrderByDescending(row => row.ObservedAt)
            .ThenByDescending(row => row.Id)
            .Skip((normalized.Page - 1) * normalized.PageSize)
            .Take(normalized.PageSize)
            .Select(row => new PlatformOpsPaddleDeliveryItem(
                row.Id,
                row.EventId,
                row.EventType,
                row.Disposition.ToString(),
                row.TenantId,
                row.HttpStatus,
                row.DetailSanitized,
                row.ObservedAt))
            .ToListAsync(cancellationToken);

        return new PlatformOpsPaddleDeliveryQueryResult(
            true,
            new PlatformOpsPaddleDeliveryListResponse(
                items,
                normalized.Page,
                normalized.PageSize,
                totalCount),
            null);
    }

    internal static bool TryNormalize(
        PlatformOpsPaddleDeliveryListQuery query,
        out NormalizedPaddleDeliveryQuery normalized,
        out string error)
    {
        normalized = default;
        error = string.Empty;

        PaddleWebhookDeliveryDisposition? disposition = null;
        if (!string.IsNullOrWhiteSpace(query.Disposition))
        {
            if (!PaddleWebhookDispositionMapper.TryParse(query.Disposition, out var parsed))
            {
                error = "disposition must be one of processed, duplicate, ignored, retryable, rejected.";
                return false;
            }

            disposition = parsed;
        }

        string? eventType = null;
        if (!string.IsNullOrWhiteSpace(query.EventType))
        {
            eventType = query.EventType.Trim();
            if (eventType.Length > MaxEventTypeLength)
            {
                error = $"eventType must be at most {MaxEventTypeLength} characters.";
                return false;
            }
        }

        if (query.From is { } from && query.To is { } to && from > to)
        {
            error = "from must be less than or equal to to. Date filters apply to ObservedAt (UTC).";
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

        normalized = new NormalizedPaddleDeliveryQuery(
            disposition,
            eventType,
            query.TenantId,
            query.From,
            query.To,
            page,
            pageSize);
        return true;
    }

    internal readonly record struct NormalizedPaddleDeliveryQuery(
        PaddleWebhookDeliveryDisposition? Disposition,
        string? EventType,
        Guid? TenantId,
        DateTimeOffset? From,
        DateTimeOffset? To,
        int Page,
        int PageSize);
}
