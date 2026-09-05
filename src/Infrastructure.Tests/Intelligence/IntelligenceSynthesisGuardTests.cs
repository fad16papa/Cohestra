using Cohestra.Application.Intelligence;
using Cohestra.Contracts.Intelligence;
using Cohestra.Infrastructure.Intelligence;

namespace Cohestra.Infrastructure.Tests.Intelligence;

public sealed class IntelligenceSynthesisGuardTests
{
    [Fact]
    public void Apply_RewritesWording_KeepsFactsAndSetsSynthesizedMode()
    {
        var facts = Brief(
            Insight(
                "follow-up-due",
                "1 person is due for follow-up",
                "These people already have a next-follow-up date.",
                new IntelligenceEvidenceResponse("People due", "1", "/clients?followUpDue=true")));

        var result = IntelligenceSynthesisGuard.Apply(
            facts,
            [new IntelligenceWordingDraft(
                "follow-up-due",
                "Start with the 1 person due today",
                "A follow-up date is already on the record.",
                null)]);

        Assert.Equal("synthesized", result.Mode);
        var insight = Assert.Single(result.Insights);
        Assert.Equal("Start with the 1 person due today", insight.Title);
        Assert.Equal("follow_up_due", insight.Kind);
        Assert.Equal("1", insight.Evidence[0].Value);
        Assert.Equal("/clients?followUpDue=true", insight.RecommendedAction.Href);
    }

    [Fact]
    public void Apply_RejectsInventedNumber()
    {
        var facts = Brief(
            Insight(
                "follow-up-due",
                "1 person is due for follow-up",
                "A date is set.",
                new IntelligenceEvidenceResponse("People due", "1", "/clients?followUpDue=true")));

        Assert.Throws<InvalidOperationException>(() => IntelligenceSynthesisGuard.Apply(
            facts,
            [new IntelligenceWordingDraft(
                "follow-up-due",
                "47 people need you now",
                "A date is set.",
                null)]));
    }

    [Fact]
    public void Apply_RejectsMissingInsight()
    {
        var facts = Brief(
            Insight(
                "follow-up-due",
                "1 person is due for follow-up",
                "A date is set.",
                new IntelligenceEvidenceResponse("People due", "1", "/clients?followUpDue=true")),
            Insight(
                "merge-suspects",
                "2 possible duplicates need a look",
                "Matching flagged them.",
                new IntelligenceEvidenceResponse("Merge suspects", "2", "/clients?mergeSuspect=true")));

        Assert.Throws<InvalidOperationException>(() => IntelligenceSynthesisGuard.Apply(
            facts,
            [new IntelligenceWordingDraft(
                "follow-up-due",
                "Start with the 1 person due today",
                "A date is set.",
                null)]));
    }

    private static IntelligenceBriefResponse Brief(params IntelligenceInsightResponse[] insights) =>
        new(
            DateTimeOffset.UtcNow,
            "UTC",
            IntelligenceBriefService.DeterministicMode,
            insights,
            new IntelligenceInsufficientDataResponse(false, string.Empty));

    private static IntelligenceInsightResponse Insight(
        string id,
        string title,
        string why,
        IntelligenceEvidenceResponse evidence) =>
        new(
            id,
            id.Replace('-', '_'),
            1,
            title,
            why,
            null,
            [evidence],
            new IntelligenceActionResponse("Open", evidence.Href ?? "/clients"));
}
