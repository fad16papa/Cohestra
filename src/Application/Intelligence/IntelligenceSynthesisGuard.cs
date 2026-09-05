using System.Globalization;
using System.Text.RegularExpressions;
using Cohestra.Contracts.Intelligence;

namespace Cohestra.Application.Intelligence;

public static class IntelligenceSynthesisGuard
{
    private static readonly Regex NumberPattern = new(
        @"\d+(?:\.\d+)?",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static IntelligenceBriefResponse Apply(
        IntelligenceBriefResponse facts,
        IReadOnlyList<IntelligenceWordingDraft> drafts)
    {
        if (facts.Insights.Count == 0)
        {
            throw new InvalidOperationException("Synthesis is not applied to an empty brief.");
        }

        if (drafts.Count != facts.Insights.Count)
        {
            throw new InvalidOperationException("Synthesized insight count must match the fact brief.");
        }

        var draftsById = new Dictionary<string, IntelligenceWordingDraft>(StringComparer.Ordinal);
        foreach (var draft in drafts)
        {
            if (string.IsNullOrWhiteSpace(draft.Id)
                || string.IsNullOrWhiteSpace(draft.Title)
                || string.IsNullOrWhiteSpace(draft.WhyItMatters))
            {
                throw new InvalidOperationException("Synthesized wording is incomplete.");
            }

            if (!draftsById.TryAdd(draft.Id, draft))
            {
                throw new InvalidOperationException("Synthesized wording repeated an insight id.");
            }
        }

        var rewritten = new List<IntelligenceInsightResponse>(facts.Insights.Count);
        foreach (var insight in facts.Insights)
        {
            if (!draftsById.TryGetValue(insight.Id, out var draft))
            {
                throw new InvalidOperationException("Synthesized wording is missing a fact insight.");
            }

            AssertNumbersAllowed(insight, draft);
            rewritten.Add(insight with
            {
                Title = draft.Title.Trim(),
                WhyItMatters = draft.WhyItMatters.Trim(),
                WhatChanged = string.IsNullOrWhiteSpace(draft.WhatChanged)
                    ? insight.WhatChanged
                    : draft.WhatChanged.Trim(),
            });
        }

        return facts with
        {
            Mode = "synthesized",
            Insights = rewritten,
        };
    }

    private static void AssertNumbersAllowed(
        IntelligenceInsightResponse insight,
        IntelligenceWordingDraft draft)
    {
        var allowed = ExtractNumbers(
            string.Join(
                ' ',
                insight.Title,
                insight.WhyItMatters,
                insight.WhatChanged ?? string.Empty,
                string.Join(' ', insight.Evidence.Select(item => item.Value))));

        var used = ExtractNumbers(
            string.Join(' ', draft.Title, draft.WhyItMatters, draft.WhatChanged ?? string.Empty));

        if (used.Any(number => !allowed.Contains(number)))
        {
            throw new InvalidOperationException("Synthesized wording introduced a number that is not in the facts.");
        }
    }

    private static HashSet<string> ExtractNumbers(string text) =>
        NumberPattern
            .Matches(text)
            .Select(match => match.Value)
            .ToHashSet(StringComparer.Ordinal);
}
