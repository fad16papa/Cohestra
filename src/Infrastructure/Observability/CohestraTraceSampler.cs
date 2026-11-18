using OpenTelemetry.Trace;

namespace Cohestra.Infrastructure.Observability;

public sealed class CohestraTraceSampler : Sampler
{
    private readonly TraceIdRatioBasedSampler _ratioSampler;

    public CohestraTraceSampler(double ratio)
    {
        var bounded = double.IsNaN(ratio) ? 0.1 : Math.Clamp(ratio, 0, 1);
        _ratioSampler = new TraceIdRatioBasedSampler(bounded);
    }

    public static Sampler CreateParentAware(double ratio)
    {
        var inner = new CohestraTraceSampler(ratio);
        return new ParentBasedSampler(
            inner,
            remoteParentSampled: inner,
            remoteParentNotSampled: inner,
            localParentSampled: new AlwaysOnSampler(),
            localParentNotSampled: inner);
    }

    public override SamplingResult ShouldSample(in SamplingParameters samplingParameters)
    {
        if (CohestraTelemetry.IsAlwaysOnActivity(samplingParameters.Name))
        {
            return new SamplingResult(SamplingDecision.RecordAndSample);
        }

        if (samplingParameters.Tags is not null)
        {
            foreach (var tag in samplingParameters.Tags)
            {
                if (tag.Key is "http.route" or "url.path"
                    && tag.Value is string path
                    && path.Contains("/api/v1/system/paddle/webhook", StringComparison.OrdinalIgnoreCase))
                {
                    return new SamplingResult(SamplingDecision.RecordAndSample);
                }
            }
        }

        return _ratioSampler.ShouldSample(in samplingParameters);
    }
}
