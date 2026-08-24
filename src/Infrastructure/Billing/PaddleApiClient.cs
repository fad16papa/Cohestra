using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Billing;

internal sealed class PaddleApiClient : IPaddleApiClient
{
    private readonly HttpClient _http;

    public PaddleApiClient(HttpClient http, IOptions<PaddleSettings> options)
    {
        _http = http;
        if (_http.BaseAddress is null)
        {
            _http.BaseAddress = new Uri(
                options.Value.IsSandbox
                    ? "https://sandbox-api.paddle.com/"
                    : "https://api.paddle.com/");
        }

        if (!string.IsNullOrWhiteSpace(options.Value.ApiKey)
            && _http.DefaultRequestHeaders.Authorization is null)
        {
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", options.Value.ApiKey.Trim());
        }
    }

    public Task<PaddleCustomer> CreateCustomerAsync(
        string email,
        string name,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleCustomer>(
            HttpMethod.Post,
            "customers",
            new PaddleCustomerWrite
            {
                Email = email,
                Name = name,
                CustomData = customData.ToDictionary(static pair => pair.Key, static pair => pair.Value),
            },
            cancellationToken);

    public async Task<PaddleCustomer?> FindCustomerByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var path =
            $"customers?email={Uri.EscapeDataString(email.Trim())}&status=active,archived&per_page=1";
        var matches = await SendListAsync<PaddleCustomer>(path, cancellationToken);
        return matches.FirstOrDefault(customer =>
            string.Equals(customer.Email, email.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public Task<PaddleCustomer?> GetCustomerAsync(
        string customerId,
        CancellationToken cancellationToken = default) =>
        SendOptionalAsync<PaddleCustomer>(HttpMethod.Get, $"customers/{customerId}", null, cancellationToken);

    public Task<PaddleCustomer> UpdateCustomerAsync(
        string customerId,
        string? email,
        string? name,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleCustomer>(
            HttpMethod.Patch,
            $"customers/{customerId}",
            new PaddleCustomerWrite
            {
                Email = email,
                Name = name,
            },
            cancellationToken);

    public Task<PaddleTransaction> CreateCheckoutTransactionAsync(
        string priceId,
        string customerId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleTransaction>(
            HttpMethod.Post,
            "transactions",
            new PaddleTransactionCreate
            {
                CustomerId = customerId,
                CurrencyCode = "USD",
                CollectionMode = "automatic",
                Items = [new PaddlePriceQuantity { PriceId = priceId, Quantity = 1 }],
                CustomData = customData.ToDictionary(static pair => pair.Key, static pair => pair.Value),
            },
            cancellationToken);

    public Task<PaddleTransaction?> GetTransactionAsync(
        string transactionId,
        CancellationToken cancellationToken = default) =>
        SendOptionalAsync<PaddleTransaction>(
            HttpMethod.Get,
            $"transactions/{transactionId}",
            null,
            cancellationToken);

    public async Task<IReadOnlyList<PaddleTransaction>> ListTransactionsAsync(
        string customerId,
        CancellationToken cancellationToken = default)
    {
        var path = $"transactions?customer_id={Uri.EscapeDataString(customerId)}&per_page=24";
        return await SendListAsync<PaddleTransaction>(path, cancellationToken);
    }

    public async Task<string?> GetTransactionInvoiceUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default)
    {
        var invoice = await SendOptionalAsync<PaddleInvoiceFile>(
            HttpMethod.Get,
            $"transactions/{transactionId}/invoice",
            null,
            cancellationToken);
        return string.IsNullOrWhiteSpace(invoice?.Url) ? null : invoice.Url;
    }

    public Task<PaddleSubscription> CreateSubscriptionAsync(
        string customerId,
        string priceId,
        IReadOnlyDictionary<string, string> customData,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleSubscription>(
            HttpMethod.Post,
            "subscriptions",
            new PaddleSubscriptionCreate
            {
                CustomerId = customerId,
                CurrencyCode = "USD",
                CollectionMode = "automatic",
                Items = [new PaddlePriceQuantity { PriceId = priceId, Quantity = 1 }],
                CustomData = customData.ToDictionary(static pair => pair.Key, static pair => pair.Value),
            },
            cancellationToken);

    public Task<PaddleSubscription?> GetSubscriptionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendOptionalAsync<PaddleSubscription>(
            HttpMethod.Get,
            $"subscriptions/{subscriptionId}",
            null,
            cancellationToken);

    public async Task<IReadOnlyList<PaddleSubscription>> ListSubscriptionsAsync(
        string customerId,
        CancellationToken cancellationToken = default)
    {
        var path = $"subscriptions?customer_id={Uri.EscapeDataString(customerId)}&per_page=10";
        return await SendListAsync<PaddleSubscription>(path, cancellationToken);
    }

    public Task<PaddleSubscription> UpdateSubscriptionItemsAsync(
        string subscriptionId,
        string priceId,
        string effectiveFrom,
        string prorationBillingMode,
        IReadOnlyDictionary<string, string>? customData = null,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleSubscription>(
            HttpMethod.Patch,
            $"subscriptions/{subscriptionId}",
            new PaddleSubscriptionUpdate
            {
                Items = [new PaddlePriceQuantity { PriceId = priceId, Quantity = 1 }],
                EffectiveFrom = effectiveFrom,
                ProrationBillingMode = prorationBillingMode,
                CustomData = customData?.ToDictionary(static pair => pair.Key, static pair => pair.Value),
            },
            cancellationToken);

    public Task<PaddleSubscription> EndTrialNowAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleSubscription>(
            HttpMethod.Patch,
            $"subscriptions/{subscriptionId}",
            new PaddleSubscriptionUpdate
            {
                NextBilledAt = DateTimeOffset.UtcNow,
                ProrationBillingMode = "full_immediately",
            },
            cancellationToken);

    public Task<PaddleSubscription> CancelSubscriptionAtPeriodEndAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleSubscription>(
            HttpMethod.Post,
            $"subscriptions/{subscriptionId}/cancel",
            new PaddleCancelRequest { EffectiveFrom = "next_billing_period" },
            cancellationToken);

    public Task<PaddleSubscription> ClearScheduledChangeAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendRawRequiredAsync<PaddleSubscription>(
            HttpMethod.Patch,
            $"subscriptions/{subscriptionId}",
            """{"scheduled_change":null}""",
            cancellationToken);

    public Task<PaddleTransaction> CreateUpdatePaymentMethodTransactionAsync(
        string subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddleTransaction>(
            HttpMethod.Post,
            $"subscriptions/{subscriptionId}/update-payment-method-transaction",
            new { },
            cancellationToken);

    public Task<IReadOnlyList<PaddlePaymentMethod>> ListPaymentMethodsAsync(
        string customerId,
        CancellationToken cancellationToken = default) =>
        SendListAsync<PaddlePaymentMethod>(
            $"customers/{Uri.EscapeDataString(customerId)}/payment-methods?per_page=10",
            cancellationToken);

    public Task<PaddlePortalSession> CreatePortalSessionAsync(
        string customerId,
        string? subscriptionId,
        CancellationToken cancellationToken = default) =>
        SendRequiredAsync<PaddlePortalSession>(
            HttpMethod.Post,
            $"customers/{customerId}/portal-sessions",
            new PaddlePortalSessionCreate
            {
                SubscriptionIds = string.IsNullOrWhiteSpace(subscriptionId) ? null : [subscriptionId],
            },
            cancellationToken);

    private async Task<T> SendRequiredAsync<T>(
        HttpMethod method,
        string path,
        object? body,
        CancellationToken cancellationToken) where T : class
    {
        var result = await SendOptionalAsync<T>(method, path, body, cancellationToken);
        return result ?? throw new PaddleApiException($"Paddle returned an empty {typeof(T).Name}.");
    }

    private async Task<T?> SendOptionalAsync<T>(
        HttpMethod method,
        string path,
        object? body,
        CancellationToken cancellationToken) where T : class
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = new StringContent(
                JsonSerializer.Serialize(body, PaddleJson.Options),
                Encoding.UTF8,
                "application/json");
        }

        using var response = await _http.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }

        EnsureSuccess(response, json);
        if (string.IsNullOrWhiteSpace(json))
        {
            return default;
        }

        var envelope = JsonSerializer.Deserialize<PaddleEnvelope<T>>(json, PaddleJson.Options);
        return envelope is null ? default : envelope.Data;
    }

    private async Task<T> SendRawRequiredAsync<T>(
        HttpMethod method,
        string path,
        string jsonBody,
        CancellationToken cancellationToken) where T : class
    {
        using var request = new HttpRequestMessage(method, path)
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, "application/json"),
        };
        using var response = await _http.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, json);
        var envelope = JsonSerializer.Deserialize<PaddleEnvelope<T>>(json, PaddleJson.Options);
        return envelope?.Data ?? throw new PaddleApiException($"Paddle returned an empty {typeof(T).Name}.");
    }

    private async Task<IReadOnlyList<T>> SendListAsync<T>(string path, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        using var response = await _http.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }

        EnsureSuccess(response, json);
        var envelope = JsonSerializer.Deserialize<PaddleEnvelope<List<T>>>(json, PaddleJson.Options);
        return envelope?.Data ?? [];
    }

    private static void EnsureSuccess(HttpResponseMessage response, string json)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        string? code = null;
        string? detail = null;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "{}" : json);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                code = error.TryGetProperty("code", out var codeEl) && codeEl.ValueKind == JsonValueKind.String
                    ? codeEl.GetString()
                    : null;
                detail = error.TryGetProperty("detail", out var detailEl) && detailEl.ValueKind == JsonValueKind.String
                    ? detailEl.GetString()
                    : null;
            }
        }
        catch (JsonException)
        {
            // Keep the HTTP status as the failure reason.
        }

        throw new PaddleApiException(
            string.IsNullOrWhiteSpace(detail)
                ? $"Paddle request failed ({(int)response.StatusCode})."
                : detail,
            (int)response.StatusCode,
            code);
    }
}
