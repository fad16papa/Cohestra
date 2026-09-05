using Cohestra.Application.Intelligence;
using Cohestra.Contracts.Intelligence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Intelligence;

public sealed class IntelligenceBriefComposer(
    IntelligenceBriefService factService,
    IIntelligenceSynthesizer synthesizer,
    IOptions<IntelligenceOptions> options,
    ILogger<IntelligenceBriefComposer> logger) : IIntelligenceBriefService
{
    public async Task<IntelligenceBriefResponse> GetBriefAsync(
        CancellationToken cancellationToken = default)
    {
        var facts = await factService.GetBriefAsync(cancellationToken);
        var settings = options.Value;
        var synthesisConfigured = settings.SynthesisEnabled && !string.IsNullOrWhiteSpace(settings.ApiKey);
        if (!synthesisConfigured || facts.Insights.Count == 0)
        {
            logger.LogInformation(
                "Intelligence brief ready. Mode={Mode} InsightCount={InsightCount} Insufficient={Insufficient} SynthesisAttempted={SynthesisAttempted}",
                facts.Mode,
                facts.Insights.Count,
                facts.InsufficientData.IsInsufficient,
                false);
            return facts;
        }

        try
        {
            var drafts = await synthesizer.SynthesizeAsync(facts, cancellationToken);
            if (drafts is null)
            {
                logger.LogInformation(
                    "Intelligence brief ready. Mode={Mode} InsightCount={InsightCount} Insufficient={Insufficient} SynthesisAttempted={SynthesisAttempted}",
                    facts.Mode,
                    facts.Insights.Count,
                    facts.InsufficientData.IsInsufficient,
                    true);
                return facts;
            }

            var synthesized = IntelligenceSynthesisGuard.Apply(facts, drafts);
            logger.LogInformation(
                "Intelligence brief ready. Mode={Mode} InsightCount={InsightCount} Insufficient={Insufficient} SynthesisAttempted={SynthesisAttempted}",
                synthesized.Mode,
                synthesized.Insights.Count,
                synthesized.InsufficientData.IsInsufficient,
                true);
            return synthesized;
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Intelligence synthesis failed; returning deterministic brief. InsightCount={InsightCount}",
                facts.Insights.Count);
            return facts;
        }
    }
}
