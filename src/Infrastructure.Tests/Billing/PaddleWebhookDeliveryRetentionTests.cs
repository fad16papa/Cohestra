using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookDeliveryRetentionTests
{
    [Fact]
    public void Rejected_is_high_noise()
    {
        Assert.True(PaddleWebhookDeliveryRetention.IsHighNoise(PaddleWebhookDeliveryDisposition.Rejected));
        Assert.False(PaddleWebhookDeliveryRetention.IsHighNoise(PaddleWebhookDeliveryDisposition.Processed));
        Assert.False(PaddleWebhookDeliveryRetention.IsHighNoise(PaddleWebhookDeliveryDisposition.Retryable));
    }

    [Fact]
    public async Task Prune_removes_expired_rejected_before_other_and_never_touches_ledger()
    {
        await using var db = CreateDb();
        var now = DateTimeOffset.Parse("2026-10-09T12:00:00Z");
        db.PaddleWebhookEvents.Add(new PaddleWebhookEvent
        {
            Id = Guid.CreateVersion7(),
            EventId = "evt_keep",
            EventType = "transaction.completed",
            ProcessedAt = now.AddDays(-200),
        });
        db.PaddleWebhookDeliveries.AddRange(
            Row(PaddleWebhookDeliveryDisposition.Rejected, now.AddDays(-15)),
            Row(PaddleWebhookDeliveryDisposition.Rejected, now.AddDays(-1)),
            Row(PaddleWebhookDeliveryDisposition.Processed, now.AddDays(-91)),
            Row(PaddleWebhookDeliveryDisposition.Processed, now.AddDays(-10)));
        await db.SaveChangesAsync();

        await PaddleWebhookDeliveryRetention.PruneAsync(
            db,
            now,
            new PaddleWebhookDeliveryRetentionOptions(14, 90, 50_000, 10_000));

        var leftover = await db.PaddleWebhookDeliveries.ToListAsync();
        Assert.Equal(2, leftover.Count);
        Assert.Contains(leftover, row => row.Disposition == PaddleWebhookDeliveryDisposition.Rejected);
        Assert.Contains(leftover, row => row.Disposition == PaddleWebhookDeliveryDisposition.Processed);
        Assert.Equal(1, await db.PaddleWebhookEvents.CountAsync());
    }

    [Fact]
    public async Task Fifo_cap_removes_oldest_eligible_rows_first()
    {
        await using var db = CreateDb();
        var now = DateTimeOffset.Parse("2026-10-09T12:00:00Z");
        db.PaddleWebhookDeliveries.AddRange(
            Row(PaddleWebhookDeliveryDisposition.Rejected, now.AddMinutes(-4), "old-rejected"),
            Row(PaddleWebhookDeliveryDisposition.Rejected, now.AddMinutes(-3), "keep-rejected"),
            Row(PaddleWebhookDeliveryDisposition.Processed, now.AddMinutes(-2), "old-processed"),
            Row(PaddleWebhookDeliveryDisposition.Processed, now.AddMinutes(-1), "keep-processed"));
        await db.SaveChangesAsync();

        await PaddleWebhookDeliveryRetention.PruneAsync(
            db,
            now,
            new PaddleWebhookDeliveryRetentionOptions(14, 90, MaxRows: 3, RejectedMaxRows: 1));

        var leftover = await db.PaddleWebhookDeliveries
            .OrderBy(row => row.ObservedAt)
            .ToListAsync();
        Assert.Equal(3, leftover.Count);
        Assert.DoesNotContain(leftover, row => row.EventId == "old-rejected");
        Assert.Contains(leftover, row => row.EventId == "keep-rejected");
        Assert.Equal(1, leftover.Count(row => row.Disposition == PaddleWebhookDeliveryDisposition.Rejected));
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync());
    }

    private static PaddleWebhookDelivery Row(
        PaddleWebhookDeliveryDisposition disposition,
        DateTimeOffset observedAt,
        string? eventId = null) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            EventId = eventId,
            EventType = "transaction.completed",
            Disposition = disposition,
            HttpStatus = disposition == PaddleWebhookDeliveryDisposition.Rejected ? 400 : 200,
            ObservedAt = observedAt,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
