using System.Net;
using System.Net.Http.Json;
using System.Text;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class PaddleWebhookIntegrationTests : IAsyncLifetime
{
    private PaddleWebhookWebApplicationFactory? _factory;

    private PaddleWebhookWebApplicationFactory Factory =>
        _factory ?? throw new InvalidOperationException("Test factory not initialized.");

    public async Task InitializeAsync()
    {
        _factory = new PaddleWebhookWebApplicationFactory();
        await _factory.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }
    }

    [SkippableFact]
    public async Task Webhook_missing_signature_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.PostAsync(
            "/api/v1/system/paddle/webhook",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SkippableFact]
    public async Task Webhook_invalid_signature_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/system/paddle/webhook")
        {
            Content = new StringContent("""{"event_id":"evt_bad"}""", Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation("Paddle-Signature", "ts=1;h1=deadbeef");

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SkippableFact]
    public async Task Webhook_payment_failed_is_idempotent_and_starts_pastdue()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var tenant = await SeedBillableTenantAsync();
        var eventId = $"evt_fail_{Guid.NewGuid():N}";
        var body = PaymentFailedPayload(eventId, tenant);

        using var client = Factory.CreateClient();
        using var first = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstPayload = await first.Content.ReadFromJsonAsync<WebhookAck>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(firstPayload);
        Assert.True(firstPayload.Processed);

        using var second = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondPayload = await second.Content.ReadFromJsonAsync<WebhookAck>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(secondPayload);
        Assert.True(secondPayload.Duplicate);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var updated = await db.Tenants.SingleAsync(item => item.Id == tenant.Id);
        Assert.Equal(BillingStatus.PastDue, updated.BillingStatus);
        Assert.NotNull(updated.DelinquencyStartedAt);
        Assert.Equal(1, await db.PaddleWebhookEvents.CountAsync(item => item.EventId == eventId));
    }

    [SkippableFact]
    public async Task Webhook_handler_failure_returns_503_without_ledger()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var eventId = $"evt_retry_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "transaction.payment_failed",
              "data": {
                "id": "txn_retry_{{eventId}}",
                "status": "past_due",
                "customer_id": "ctm_missing_{{eventId}}"
              }
            }
            """;

        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync(item => item.EventId == eventId));
    }

    [SkippableFact]
    public async Task Webhook_approved_refund_leaves_entitlements()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var tenant = await SeedBillableTenantAsync();
        var eventId = $"evt_rf_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "adjustment.created",
              "data": {
                "id": "adj_{{eventId}}",
                "action": "refund",
                "status": "approved",
                "customer_id": "{{tenant.PaddleCustomerId}}",
                "subscription_id": "{{tenant.PaddleSubscriptionId}}"
              }
            }
            """;

        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var updated = await db.Tenants.SingleAsync(item => item.Id == tenant.Id);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.Equal(BillingStatus.Active, updated.BillingStatus);
    }

    [SkippableFact]
    public async Task Webhook_approved_chargeback_starts_pastdue()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var tenant = await SeedBillableTenantAsync();
        var eventId = $"evt_cb_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "adjustment.updated",
              "data": {
                "id": "adj_{{eventId}}",
                "action": "chargeback",
                "status": "approved",
                "customer_id": "{{tenant.PaddleCustomerId}}",
                "subscription_id": "{{tenant.PaddleSubscriptionId}}"
              }
            }
            """;

        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var updated = await db.Tenants.SingleAsync(item => item.Id == tenant.Id);
        Assert.Equal(BillingStatus.PastDue, updated.BillingStatus);
        Assert.Equal(TenantPlan.Pro, updated.Plan);
        Assert.NotNull(updated.DelinquencyStartedAt);
    }

    [SkippableFact]
    public async Task Webhook_invalid_payload_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, """{"event_type":"subscription.updated","data":{}}""");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<Tenant> SeedBillableTenantAsync()
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var slug = $"wh-{Guid.NewGuid():N}"[..16];
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = "Webhook Studio",
            Plan = TenantPlan.Pro,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Active,
            AdminContactEmail = $"admin-{slug}@example.com",
            PaddleCustomerId = $"ctm_{slug}",
            PaddleSubscriptionId = $"sub_{slug}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();
        return tenant;
    }

    private static string PaymentFailedPayload(string eventId, Tenant tenant) =>
        $$"""
        {
          "event_id": "{{eventId}}",
          "event_type": "transaction.payment_failed",
          "data": {
            "id": "txn_{{eventId}}",
            "status": "past_due",
            "customer_id": "{{tenant.PaddleCustomerId}}",
            "subscription_id": "{{tenant.PaddleSubscriptionId}}"
          }
        }
        """;

    private static async Task<HttpResponseMessage> PostSignedAsync(HttpClient client, string body)
    {
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header =
            $"ts={ts};h1={PaddleSignature.ComputeHexHmac(PaddleWebhookWebApplicationFactory.WebhookSecret, $"{ts}:{body}")}";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/system/paddle/webhook")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation("Paddle-Signature", header);
        return await client.SendAsync(request);
    }

    private sealed record WebhookAck(bool Received, bool Processed, bool Duplicate, string? Detail);
}
