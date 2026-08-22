namespace Cohestra.Infrastructure.Billing;

public sealed class PaddleSettings
{
    public const string SectionName = "Paddle";

    public string ApiKey { get; set; } = string.Empty;

    public string ClientToken { get; set; } = string.Empty;

    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>sandbox or production.</summary>
    public string Environment { get; set; } = "sandbox";

    public string PriceCoreMonthly { get; set; } = string.Empty;

    public string PriceCoreAnnual { get; set; } = string.Empty;

    public string PriceProMonthly { get; set; } = string.Empty;

    public string PriceProAnnual { get; set; } = string.Empty;

    public int TrialPeriodDays { get; set; } = 30;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public bool IsSandbox =>
        string.Equals(Environment.Trim(), "sandbox", StringComparison.OrdinalIgnoreCase);
}
