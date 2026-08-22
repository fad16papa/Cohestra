using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookProcessorTests
{
    [Fact]
    public async Task ProcessAsync_does_not_ledger_stub_receipts()
    {
        await using var db = CreateDb();
        var processor = new PaddleWebhookProcessor(db, NullLogger<PaddleWebhookProcessor>.Instance);

        var first = await processor.ProcessAsync("ntf_1", "subscription.created");
        var second = await processor.ProcessAsync("ntf_1", "subscription.created");

        Assert.False(first.Processed);
        Assert.False(first.Duplicate);
        Assert.Contains("29.3", first.Detail, StringComparison.Ordinal);
        Assert.False(second.Duplicate);
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync());
    }

    [Fact]
    public async Task ProcessAsync_missing_event_id_is_not_ledgered()
    {
        await using var db = CreateDb();
        var processor = new PaddleWebhookProcessor(db, NullLogger<PaddleWebhookProcessor>.Instance);

        var result = await processor.ProcessAsync(" ", "subscription.updated");

        Assert.False(result.Processed);
        Assert.False(result.Duplicate);
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync());
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
