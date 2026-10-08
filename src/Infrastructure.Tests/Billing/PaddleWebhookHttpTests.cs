using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookHttpTests
{
    [Theory]
    [InlineData(PaddleWebhookDisposition.Processed, StatusCodes.Status200OK)]
    [InlineData(PaddleWebhookDisposition.Duplicate, StatusCodes.Status200OK)]
    [InlineData(PaddleWebhookDisposition.Ignored, StatusCodes.Status200OK)]
    [InlineData(PaddleWebhookDisposition.Retryable, StatusCodes.Status503ServiceUnavailable)]
    [InlineData(PaddleWebhookDisposition.Invalid, StatusCodes.Status400BadRequest)]
    public void StatusCodeFor_maps_disposition(PaddleWebhookDisposition disposition, int expected)
    {
        var result = new PaddleWebhookProcessResult(false, false, "x", disposition);

        Assert.Equal(expected, PaddleWebhookHttp.StatusCodeFor(result));
    }

    [Fact]
    public void Retry_factory_is_retryable_503()
    {
        var result = PaddleWebhookProcessResult.Retry("Handler failed.");

        Assert.Equal(PaddleWebhookDisposition.Retryable, result.Disposition);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, PaddleWebhookHttp.StatusCodeFor(result));
    }
}
