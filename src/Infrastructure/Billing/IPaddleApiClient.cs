namespace Cohestra.Infrastructure.Billing;

internal interface IPaddleApiClient
{
    Task<PaddleCustomer> CreateCustomerAsync(
        string email,
        string name,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default);

    Task<PaddleCustomer?> FindCustomerByEmailAsync(
        string email,
        CancellationToken cancellationToken = default);

    Task<PaddleCustomer?> GetCustomerAsync(string customerId, CancellationToken cancellationToken = default);

    Task<PaddleCustomer> UpdateCustomerAsync(
        string customerId,
        string? email,
        string? name,
        CancellationToken cancellationToken = default);

    Task<PaddleTransaction> CreateCheckoutTransactionAsync(
        string priceId,
        string customerId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default);

    Task<PaddleTransaction?> GetTransactionAsync(
        string transactionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaddleTransaction>> ListTransactionsAsync(
        string customerId,
        CancellationToken cancellationToken = default);

    Task<string?> GetTransactionInvoiceUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription> CreateSubscriptionAsync(
        string customerId,
        string priceId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription?> GetSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaddleSubscription>> ListSubscriptionsAsync(
        string customerId,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription> UpdateSubscriptionItemsAsync(
        string subscriptionId,
        string priceId,
        string effectiveFrom,
        string prorationBillingMode,
        IReadOnlyDictionary<string, string>? customData = null,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription> EndTrialNowAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription> CancelSubscriptionAtPeriodEndAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    Task<PaddleSubscription> ClearScheduledChangeAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    Task<PaddleTransaction> CreateUpdatePaymentMethodTransactionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PaddlePaymentMethod>> ListPaymentMethodsAsync(
        string customerId,
        CancellationToken cancellationToken = default);

    Task<PaddlePortalSession> CreatePortalSessionAsync(
        string customerId,
        string? subscriptionId,
        CancellationToken cancellationToken = default);
}
