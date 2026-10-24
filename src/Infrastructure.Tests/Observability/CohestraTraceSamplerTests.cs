using System.Diagnostics;
using Cohestra.Infrastructure.Observability;
using OpenTelemetry.Trace;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class CohestraTraceSamplerTests
{
    [Theory]
    [InlineData(CohestraTelemetry.OutboxDispatchActivity)]
    [InlineData(CohestraTelemetry.PaddleWebhookActivity)]
    [InlineData(CohestraTelemetry.JobRunActivity)]
    [InlineData(CohestraTelemetry.UnhandledExceptionActivity)]
    public void Always_on_activities_are_sampled(string name)
    {
        var sampler = new CohestraTraceSampler(0);
        var result = sampler.ShouldSample(new SamplingParameters(
            default,
            default,
            name,
            ActivityKind.Internal,
            null,
            null));

        Assert.Equal(SamplingDecision.RecordAndSample, result.Decision);
    }

    [Fact]
    public void Paddle_webhook_http_route_is_always_sampled()
    {
        var sampler = new CohestraTraceSampler(0);
        var result = sampler.ShouldSample(new SamplingParameters(
            default,
            default,
            "GET",
            ActivityKind.Server,
            [new KeyValuePair<string, object?>("http.route", "/api/v1/system/paddle/webhook")],
            null));

        Assert.Equal(SamplingDecision.RecordAndSample, result.Decision);
    }

    [Fact]
    public void Baseline_ratio_zero_drops_ordinary_spans()
    {
        var sampler = new CohestraTraceSampler(0);
        var result = sampler.ShouldSample(new SamplingParameters(
            default,
            default,
            "GET",
            ActivityKind.Server,
            [new KeyValuePair<string, object?>("http.route", "/api/v1/admin/clients")],
            null));

        Assert.Equal(SamplingDecision.Drop, result.Decision);
    }
}
