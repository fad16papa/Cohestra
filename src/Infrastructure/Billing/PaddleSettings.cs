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

    /// <summary>
    /// Owner-approved live Paddle cutover. Required when <see cref="Environment"/> is production.
    /// UAT must leave this false and keep sandbox credentials.
    /// </summary>
    public bool AllowLive { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public bool IsSandbox =>
        string.IsNullOrWhiteSpace(Environment)
        || string.Equals(Environment.Trim(), "sandbox", StringComparison.OrdinalIgnoreCase);

    public bool LooksLikeSandboxApiKey =>
        !string.IsNullOrWhiteSpace(ApiKey)
        && ApiKey.Contains("sdbx", StringComparison.OrdinalIgnoreCase);

    public bool LooksLikeLiveApiKey =>
        !string.IsNullOrWhiteSpace(ApiKey)
        && ApiKey.Contains("live", StringComparison.OrdinalIgnoreCase)
        && !LooksLikeSandboxApiKey;

    public bool LooksLikeSandboxClientToken =>
        !string.IsNullOrWhiteSpace(ClientToken)
        && ClientToken.StartsWith("test_", StringComparison.Ordinal);

    public bool LooksLikeLiveClientToken =>
        !string.IsNullOrWhiteSpace(ClientToken)
        && ClientToken.StartsWith("live_", StringComparison.Ordinal);
}
