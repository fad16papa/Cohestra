using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

internal sealed class FakePaddleApiClient : IPaddleApiClient
{
    public PaddleCustomer Customer { get; set; } = new()
    {
        Id = "ctm_test",
        Email = "admin@example.com",
        Name = "Studio",
    };

    public PaddleSubscription? Subscription { get; set; }

    public PaddleTransaction CheckoutTransaction { get; set; } = new()
    {
        Id = "txn_checkout",
        Status = "ready",
        CustomerId = "ctm_test",
        Checkout = new PaddleCheckout { Url = "https://sandbox-pay.paddle.com/checkout?_ptxn=txn_checkout" },
    };

    public PaddleTransaction UpdatePaymentTransaction { get; set; } = new()
    {
        Id = "txn_paymethod",
        Status = "ready",
        CustomerId = "ctm_test",
        Checkout = new PaddleCheckout { Url = "https://sandbox-pay.paddle.com/checkout?_ptxn=txn_paymethod" },
    };

    public List<PaddlePaymentMethod> PaymentMethods { get; } = [];

    public List<PaddleTransaction> Transactions { get; } = [];

    public PaddlePortalSession Portal { get; set; } = new()
    {
        Urls = new PaddlePortalUrls
        {
            General = new PaddlePortalLink { Url = "https://sandbox-vendors.paddle.com/portal/test" },
        },
    };

    public bool EndTrialCalled { get; private set; }

    public bool CancelCalled { get; private set; }

    public bool ClearScheduledCalled { get; private set; }

    public string? LastUpdatePriceId { get; private set; }

    public string? LastUpdateEffectiveFrom { get; private set; }

    public List<PaddleCustomer> CustomersByEmail { get; } = [];

    public bool CreateCustomerShouldFail { get; set; }

    public int GetTransactionCalls { get; private set; }

    public int AttachSubscriptionAfterGetCalls { get; set; }

    public Task<PaddleCustomer> CreateCustomerAsync(
        string email,
        string name,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default)
    {
        if (CreateCustomerShouldFail)
        {
            throw new PaddleApiException("customer email conflicts with existing customer", 409, "conflict");
        }

        Customer = new PaddleCustomer
        {
            Id = string.IsNullOrWhiteSpace(Customer.Id) ? "ctm_test" : Customer.Id,
            Email = email,
            Name = name,
        };
        return Task.FromResult(Customer);
    }

    public Task<PaddleCustomer?> FindCustomerByEmailAsync(
        string email,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(CustomersByEmail.FirstOrDefault(customer =>
            string.Equals(customer.Email, email, StringComparison.OrdinalIgnoreCase)));

    public Task<PaddleCustomer?> GetCustomerAsync(string customerId, CancellationToken cancellationToken = default) =>
        Task.FromResult<PaddleCustomer?>(Customer.Id == customerId ? Customer : Customer);

    public Task<PaddleCustomer> UpdateCustomerAsync(
        string customerId,
        string? email,
        string? name,
        CancellationToken cancellationToken = default)
    {
        Customer.Id = customerId;
        if (!string.IsNullOrWhiteSpace(email))
        {
            Customer.Email = email;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            Customer.Name = name;
        }

        return Task.FromResult(Customer);
    }

    public Task<PaddleTransaction> CreateCheckoutTransactionAsync(
        string priceId,
        string customerId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default)
    {
        CheckoutTransaction.CustomerId = customerId;
        return Task.FromResult(CheckoutTransaction);
    }

    public Task<PaddleTransaction?> GetTransactionAsync(
        string transactionId,
        CancellationToken cancellationToken = default)
    {
        GetTransactionCalls++;
        PaddleTransaction? match = null;
        if (transactionId == CheckoutTransaction.Id)
        {
            match = CheckoutTransaction;
        }
        else if (transactionId == UpdatePaymentTransaction.Id)
        {
            match = UpdatePaymentTransaction;
        }
        else
        {
            match = Transactions.FirstOrDefault(t => t.Id == transactionId);
        }

        if (match is not null
            && AttachSubscriptionAfterGetCalls > 0
            && GetTransactionCalls >= AttachSubscriptionAfterGetCalls
            && Subscription is not null)
        {
            match.Status = string.IsNullOrWhiteSpace(match.Status) || match.Status == "ready"
                ? "completed"
                : match.Status;
            match.SubscriptionId = Subscription.Id;
            match.CustomerId ??= Subscription.CustomerId;
        }

        return Task.FromResult(match);
    }

    public Task<IReadOnlyList<PaddleTransaction>> ListTransactionsAsync(
        string customerId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<PaddleTransaction>>(Transactions);

    public Task<string?> GetTransactionInvoiceUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<string?>($"https://invoices.test/{transactionId}.pdf");

    public Task<PaddleSubscription> CreateSubscriptionAsync(
        string customerId,
        string priceId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default)
    {
        Subscription = new PaddleSubscription
        {
            Id = "sub_new",
            Status = "trialing",
            CustomerId = customerId,
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = priceId } }],
            CurrentBillingPeriod = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow,
                EndsAt = DateTimeOffset.UtcNow.AddDays(30),
            },
            TrialDates = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow,
                EndsAt = DateTimeOffset.UtcNow.AddDays(30),
            },
        };
        return Task.FromResult(Subscription);
    }

    public Task<PaddleSubscription?> GetSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(Subscription is not null && Subscription.Id == subscriptionId ? Subscription : Subscription);

    public Task<IReadOnlyList<PaddleSubscription>> ListSubscriptionsAsync(
        string customerId,
        CancellationToken cancellationToken = default)
    {
        if (Subscription is null)
        {
            return Task.FromResult<IReadOnlyList<PaddleSubscription>>([]);
        }

        if (AttachSubscriptionAfterGetCalls > 0 && GetTransactionCalls < AttachSubscriptionAfterGetCalls)
        {
            return Task.FromResult<IReadOnlyList<PaddleSubscription>>([]);
        }

        return Task.FromResult<IReadOnlyList<PaddleSubscription>>([Subscription]);
    }

    public Task<PaddleSubscription> UpdateSubscriptionItemsAsync(
        string subscriptionId,
        string priceId,
        string effectiveFrom,
        string prorationBillingMode,
        IReadOnlyDictionary<string, string>? customData = null,
        CancellationToken cancellationToken = default)
    {
        LastUpdatePriceId = priceId;
        LastUpdateEffectiveFrom = effectiveFrom;
        Subscription ??= new PaddleSubscription { Id = subscriptionId, Status = "active", CustomerId = Customer.Id };
        if (string.Equals(effectiveFrom, "immediately", StringComparison.OrdinalIgnoreCase))
        {
            Subscription.Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = priceId } }];
        }

        Subscription.Status = "active";
        Subscription.CurrentBillingPeriod ??= new PaddleTimePeriod
        {
            StartsAt = DateTimeOffset.UtcNow,
            EndsAt = DateTimeOffset.UtcNow.AddDays(30),
        };
        return Task.FromResult(Subscription);
    }

    public Task<PaddleSubscription> EndTrialNowAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
    {
        EndTrialCalled = true;
        Subscription ??= new PaddleSubscription { Id = subscriptionId, CustomerId = Customer.Id };
        Subscription.Status = "active";
        Subscription.TrialDates = null;
        return Task.FromResult(Subscription);
    }

    public Task<PaddleSubscription> CancelSubscriptionAtPeriodEndAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
    {
        CancelCalled = true;
        Subscription ??= new PaddleSubscription { Id = subscriptionId, Status = "active", CustomerId = Customer.Id };
        var periodEnd = DateTimeOffset.UtcNow.AddDays(14);
        Subscription.ScheduledChange = new PaddleScheduledChange
        {
            Action = "cancel",
            EffectiveAt = periodEnd,
        };
        Subscription.CurrentBillingPeriod = new PaddleTimePeriod
        {
            StartsAt = DateTimeOffset.UtcNow,
            EndsAt = periodEnd,
        };
        return Task.FromResult(Subscription);
    }

    public Task<PaddleSubscription> ClearScheduledChangeAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
    {
        ClearScheduledCalled = true;
        Subscription ??= new PaddleSubscription { Id = subscriptionId, Status = "active", CustomerId = Customer.Id };
        Subscription.ScheduledChange = null;
        return Task.FromResult(Subscription);
    }

    public Task<PaddleTransaction> CreateUpdatePaymentMethodTransactionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default)
    {
        UpdatePaymentTransaction.SubscriptionId = subscriptionId;
        return Task.FromResult(UpdatePaymentTransaction);
    }

    public Task<IReadOnlyList<PaddlePaymentMethod>> ListPaymentMethodsAsync(
        string customerId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<PaddlePaymentMethod>>(PaymentMethods);

    public Task<PaddlePortalSession> CreatePortalSessionAsync(
        string customerId,
        string? subscriptionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(Portal);
}
