using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Cohestra.Application.Intelligence;
using Cohestra.Contracts.Intelligence;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Intelligence;

public sealed class OpenAiCompatibleIntelligenceSynthesizer(
    HttpClient httpClient,
    IOptions<IntelligenceOptions> options) : IIntelligenceSynthesizer
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<IntelligenceWordingDraft>?> SynthesizeAsync(
        IntelligenceBriefResponse facts,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            return null;
        }

        var timeoutSeconds = Math.Clamp(settings.TimeoutSeconds, 2, 20);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        var payload = new
        {
            model = settings.Model,
            temperature = 0.2,
            max_tokens = Math.Clamp(settings.MaxOutputTokens, 64, 2000),
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "Rewrite each operator insight as a concise morning brief. Do not add, remove, or change insights. Do not invent numbers, names, or percentages. Return JSON only: {\"insights\":[{\"id\":\"...\",\"title\":\"...\",\"whyItMatters\":\"...\",\"whatChanged\":null}]}.",
                },
                new
                {
                    role = "user",
                    content = JsonSerializer.Serialize(
                        facts.Insights.Select(insight => new
                        {
                            insight.Id,
                            insight.Kind,
                            insight.Title,
                            insight.WhyItMatters,
                            insight.WhatChanged,
                            evidence = insight.Evidence.Select(item => new { item.Label, item.Value }),
                        }),
                        JsonOptions),
                },
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey.Trim());

        using var response = await httpClient.SendAsync(request, timeout.Token);
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeout.Token));
        var content = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
        if (string.IsNullOrWhiteSpace(content))
        {
            return null;
        }

        var parsed = JsonSerializer.Deserialize<SynthesisEnvelope>(content, JsonOptions);
        return parsed?.Insights;
    }

    private sealed record SynthesisEnvelope(IReadOnlyList<IntelligenceWordingDraft>? Insights);
}
