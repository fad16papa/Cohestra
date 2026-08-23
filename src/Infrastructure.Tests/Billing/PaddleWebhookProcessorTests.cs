using Cohestra.Infrastructure.Billing;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookProcessorTests
{
    [Fact]
    public async Task ProcessAsync_does_not_treat_repeated_stub_receipts_as_duplicates()
    {
        var processor = new PaddleWebhookProcessor(NullLogger<PaddleWebhookProcessor>.Instance);

        var first = await processor.ProcessAsync("ntf_1", "subscription.created");
        var second = await processor.ProcessAsync("ntf_1", "subscription.created");

        Assert.False(first.Processed);
        Assert.False(first.Duplicate);
        Assert.Contains("29.3", first.Detail, StringComparison.Ordinal);
        Assert.False(second.Duplicate);
    }

    [Fact]
    public async Task ProcessAsync_missing_event_id_is_ignored()
    {
        var processor = new PaddleWebhookProcessor(NullLogger<PaddleWebhookProcessor>.Instance);

        var result = await processor.ProcessAsync(" ", "subscription.updated");

        Assert.False(result.Processed);
        Assert.False(result.Duplicate);
        Assert.Equal("Missing event id.", result.Detail);
    }
}
