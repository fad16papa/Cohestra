namespace Cohestra.Application.Intelligence;

public sealed class IntelligenceOptions
{
    public const string SectionName = "Intelligence";

    public bool SynthesisEnabled { get; set; }

    public string? Provider { get; set; }

    public string? ApiKey { get; set; }

    public string BaseUrl { get; set; } = "https://api.openai.com/v1/";

    public string Model { get; set; } = "gpt-4.1-mini";

    public int MaxOutputTokens { get; set; } = 800;

    public int TimeoutSeconds { get; set; } = 8;
}
