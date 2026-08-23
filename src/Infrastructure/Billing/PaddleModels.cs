using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cohestra.Infrastructure.Billing;

internal sealed class PaddleEnvelope<T>
{
    public T? Data { get; set; }
}

internal sealed class PaddleCustomer
{
    public string Id { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Name { get; set; }

    public JsonElement CustomData { get; set; }
}

internal sealed class PaddleSubscription
{
    public string Id { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? CustomerId { get; set; }

    public List<PaddleSubscriptionItem> Items { get; set; } = [];

    public PaddleTimePeriod? CurrentBillingPeriod { get; set; }

    public PaddleTimePeriod? TrialDates { get; set; }

    public PaddleScheduledChange? ScheduledChange { get; set; }

    public DateTimeOffset? NextBilledAt { get; set; }

    public JsonElement CustomData { get; set; }
}

internal sealed class PaddleSubscriptionItem
{
    public int Quantity { get; set; }

    public PaddlePrice? Price { get; set; }

    public PaddleTimePeriod? TrialDates { get; set; }

    public DateTimeOffset? NextBilledAt { get; set; }
}

internal sealed class PaddlePrice
{
    public string Id { get; set; } = string.Empty;
}

internal sealed class PaddleTimePeriod
{
    public DateTimeOffset? StartsAt { get; set; }

    public DateTimeOffset? EndsAt { get; set; }
}

internal sealed class PaddleScheduledChange
{
    public string Action { get; set; } = string.Empty;

    public DateTimeOffset? EffectiveAt { get; set; }
}

internal sealed class PaddleTransaction
{
    public string Id { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? CustomerId { get; set; }

    public string? SubscriptionId { get; set; }

    public string? Origin { get; set; }

    public string? InvoiceNumber { get; set; }

    public DateTimeOffset? CreatedAt { get; set; }

    public DateTimeOffset? BilledAt { get; set; }

    public PaddleCheckout? Checkout { get; set; }

    public PaddleTransactionDetails? Details { get; set; }

    public JsonElement CustomData { get; set; }
}

internal sealed class PaddleCheckout
{
    public string? Url { get; set; }
}

internal sealed class PaddleTransactionDetails
{
    public PaddleTotals? Totals { get; set; }
}

internal sealed class PaddleTotals
{
    public string? Total { get; set; }

    public string? CurrencyCode { get; set; }
}

internal sealed class PaddlePaymentMethod
{
    public string Id { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public PaddleCard? Card { get; set; }
}

internal sealed class PaddleCard
{
    public string? Type { get; set; }

    public string? Last4 { get; set; }

    public int? ExpiryMonth { get; set; }

    public int? ExpiryYear { get; set; }
}

internal sealed class PaddlePortalSession
{
    public PaddlePortalUrls? Urls { get; set; }
}

internal sealed class PaddlePortalUrls
{
    public PaddlePortalLink? General { get; set; }

    public PaddlePortalLink? Overview { get; set; }
}

internal sealed class PaddlePortalLink
{
    public string? Url { get; set; }

    public string? Href { get; set; }

    public string? Resolved =>
        !string.IsNullOrWhiteSpace(Url) ? Url : Href;
}

internal sealed class PaddleInvoiceFile
{
    public string? Url { get; set; }
}

internal sealed class PaddleCustomerWrite
{
    public string? Email { get; set; }

    public string? Name { get; set; }

    public Dictionary<string, string>? CustomData { get; set; }
}

internal sealed class PaddleTransactionCreate
{
    public List<PaddlePriceQuantity> Items { get; set; } = [];

    public string? CustomerId { get; set; }

    public string? CurrencyCode { get; set; }

    public string? CollectionMode { get; set; }

    public Dictionary<string, string>? CustomData { get; set; }
}

internal sealed class PaddlePriceQuantity
{
    [JsonPropertyName("price_id")]
    public string PriceId { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;
}

internal sealed class PaddleSubscriptionCreate
{
    public string CustomerId { get; set; } = string.Empty;

    public List<PaddlePriceQuantity> Items { get; set; } = [];

    public string CollectionMode { get; set; } = "automatic";

    public string? CurrencyCode { get; set; }

    public Dictionary<string, string>? CustomData { get; set; }
}

internal sealed class PaddleSubscriptionUpdate
{
    public List<PaddlePriceQuantity>? Items { get; set; }

    public string? ProrationBillingMode { get; set; }

    public string? EffectiveFrom { get; set; }

    public DateTimeOffset? NextBilledAt { get; set; }

    public Dictionary<string, string>? CustomData { get; set; }
}

internal sealed class PaddleCancelRequest
{
    public string EffectiveFrom { get; set; } = "next_billing_period";
}

internal sealed class PaddlePortalSessionCreate
{
    public List<string>? SubscriptionIds { get; set; }
}

internal sealed class PaddleNotification
{
    public string? EventId { get; set; }

    public string? NotificationId { get; set; }

    public string? EventType { get; set; }

    public JsonElement Data { get; set; }
}
