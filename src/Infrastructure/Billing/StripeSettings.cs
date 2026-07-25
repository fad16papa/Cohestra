namespace Cohestra.Infrastructure.Billing;

public sealed class StripeSettings
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;

    public string PublishableKey { get; set; } = string.Empty;

    public string WebhookSecret { get; set; } = string.Empty;

    public string PriceCoreMonthly { get; set; } = string.Empty;

    public string PriceCoreAnnual { get; set; } = string.Empty;

    public string PriceProMonthly { get; set; } = string.Empty;

    public string PriceProAnnual { get; set; } = string.Empty;

    public int TrialPeriodDays { get; set; } = 30;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}
