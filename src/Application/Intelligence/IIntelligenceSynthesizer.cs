using Cohestra.Contracts.Intelligence;

namespace Cohestra.Application.Intelligence;

public sealed record IntelligenceWordingDraft(
    string Id,
    string Title,
    string WhyItMatters,
    string? WhatChanged);

public interface IIntelligenceSynthesizer
{
    Task<IReadOnlyList<IntelligenceWordingDraft>?> SynthesizeAsync(
        IntelligenceBriefResponse facts,
        CancellationToken cancellationToken = default);
}
