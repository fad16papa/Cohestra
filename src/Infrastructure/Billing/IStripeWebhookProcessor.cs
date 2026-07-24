using Stripe;

namespace Cohestra.Infrastructure.Billing;

public interface IStripeWebhookProcessor
{
    Task<StripeWebhookProcessResult> ProcessAsync(Event stripeEvent, CancellationToken cancellationToken = default);
}

public sealed record StripeWebhookProcessResult(bool Processed, bool Duplicate, string? Detail);
