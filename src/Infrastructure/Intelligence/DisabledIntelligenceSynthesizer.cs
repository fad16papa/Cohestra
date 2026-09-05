using Cohestra.Application.Intelligence;
using Cohestra.Contracts.Intelligence;

namespace Cohestra.Infrastructure.Intelligence;

public sealed class DisabledIntelligenceSynthesizer : IIntelligenceSynthesizer
{
    public Task<IReadOnlyList<IntelligenceWordingDraft>?> SynthesizeAsync(
        IntelligenceBriefResponse facts,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<IntelligenceWordingDraft>?>(null);
    }
}
