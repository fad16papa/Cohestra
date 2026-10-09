using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookDispositionMapperTests
{
    [Theory]
    [InlineData(PaddleWebhookDisposition.Processed, PaddleWebhookDeliveryDisposition.Processed)]
    [InlineData(PaddleWebhookDisposition.Duplicate, PaddleWebhookDeliveryDisposition.Duplicate)]
    [InlineData(PaddleWebhookDisposition.Ignored, PaddleWebhookDeliveryDisposition.Ignored)]
    [InlineData(PaddleWebhookDisposition.Retryable, PaddleWebhookDeliveryDisposition.Retryable)]
    [InlineData(PaddleWebhookDisposition.Invalid, PaddleWebhookDeliveryDisposition.Rejected)]
    public void Maps_processor_disposition_to_canonical_delivery(
        PaddleWebhookDisposition source,
        PaddleWebhookDeliveryDisposition expected)
    {
        Assert.Equal(expected, PaddleWebhookDispositionMapper.ToDelivery(source));
    }

    [Theory]
    [InlineData("processed", PaddleWebhookDeliveryDisposition.Processed)]
    [InlineData("Duplicate", PaddleWebhookDeliveryDisposition.Duplicate)]
    [InlineData("IGNORED", PaddleWebhookDeliveryDisposition.Ignored)]
    [InlineData("retryable", PaddleWebhookDeliveryDisposition.Retryable)]
    [InlineData("rejected", PaddleWebhookDeliveryDisposition.Rejected)]
    public void Parses_canonical_filter_values(string raw, PaddleWebhookDeliveryDisposition expected)
    {
        Assert.True(PaddleWebhookDispositionMapper.TryParse(raw, out var parsed));
        Assert.Equal(expected, parsed);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("failed")]
    [InlineData("error")]
    [InlineData("denied")]
    [InlineData("")]
    public void Rejects_overlapping_or_unknown_filter_values(string raw)
    {
        Assert.False(PaddleWebhookDispositionMapper.TryParse(raw, out _));
    }
}
