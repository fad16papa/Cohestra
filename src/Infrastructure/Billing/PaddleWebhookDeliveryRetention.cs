using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Billing;

public sealed record PaddleWebhookDeliveryRetentionOptions(
    int RejectedRetentionDays,
    int OtherRetentionDays,
    int MaxRows,
    int RejectedMaxRows)
{
    public static PaddleWebhookDeliveryRetentionOptions Production { get; } = new(14, 90, 50_000, 10_000);
}

public static class PaddleWebhookDeliveryRetention
{
    public static bool IsHighNoise(PaddleWebhookDeliveryDisposition disposition) =>
        disposition == PaddleWebhookDeliveryDisposition.Rejected;

    public static async Task PruneAsync(
        CohestraDbContext dbContext,
        DateTimeOffset now,
        PaddleWebhookDeliveryRetentionOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= PaddleWebhookDeliveryRetentionOptions.Production;

        var rejectedCutoff = now.AddDays(-options.RejectedRetentionDays);
        var otherCutoff = now.AddDays(-options.OtherRetentionDays);

        var expired = await dbContext.PaddleWebhookDeliveries
            .Where(row =>
                (row.Disposition == PaddleWebhookDeliveryDisposition.Rejected && row.ObservedAt < rejectedCutoff)
                || (row.Disposition != PaddleWebhookDeliveryDisposition.Rejected && row.ObservedAt < otherCutoff))
            .ToListAsync(cancellationToken);
        if (expired.Count > 0)
        {
            dbContext.PaddleWebhookDeliveries.RemoveRange(expired);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await CapAsync(
            dbContext,
            row => row.Disposition == PaddleWebhookDeliveryDisposition.Rejected,
            options.RejectedMaxRows,
            cancellationToken);

        await CapAsync(
            dbContext,
            _ => true,
            options.MaxRows,
            cancellationToken);
    }

    private static async Task CapAsync(
        CohestraDbContext dbContext,
        System.Linq.Expressions.Expression<Func<PaddleWebhookDelivery, bool>> predicate,
        int maxRows,
        CancellationToken cancellationToken)
    {
        var count = await dbContext.PaddleWebhookDeliveries.CountAsync(predicate, cancellationToken);
        if (count <= maxRows)
        {
            return;
        }

        var extra = count - maxRows;
        var oldest = await dbContext.PaddleWebhookDeliveries
            .Where(predicate)
            .OrderBy(row => row.ObservedAt)
            .ThenBy(row => row.Id)
            .Take(extra)
            .ToListAsync(cancellationToken);
        if (oldest.Count == 0)
        {
            return;
        }

        dbContext.PaddleWebhookDeliveries.RemoveRange(oldest);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
