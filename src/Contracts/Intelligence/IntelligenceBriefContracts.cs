namespace Cohestra.Contracts.Intelligence;

public sealed record IntelligenceEvidenceResponse(
    string Label,
    string Value,
    string? Href);

public sealed record IntelligenceActionResponse(
    string Label,
    string Href);

public sealed record IntelligenceInsightResponse(
    string Id,
    string Kind,
    int Priority,
    string Title,
    string WhyItMatters,
    string? WhatChanged,
    IReadOnlyList<IntelligenceEvidenceResponse> Evidence,
    IntelligenceActionResponse RecommendedAction);

public sealed record IntelligenceInsufficientDataResponse(
    bool IsInsufficient,
    string Message);

public sealed record IntelligenceBriefResponse(
    DateTimeOffset GeneratedAt,
    string TimeZoneId,
    string Mode,
    IReadOnlyList<IntelligenceInsightResponse> Insights,
    IntelligenceInsufficientDataResponse InsufficientData);
