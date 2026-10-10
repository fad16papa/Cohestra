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
[Collection(PaddleWebhookIntegrationCollection.Name)]
public sealed class PaddleWebhookIntegrationTests(PaddleWebhookIntegrationFixture fixture)
{
    private PaddleWebhookWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Webhook_missing_signature_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var started = DateTimeOffset.UtcNow.AddSeconds(-2);
        using var response = await client.PostAsync(
            "/api/v1/system/paddle/webhook",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertDeliveryAsync(
            started,
            PaddleWebhookDeliveryDisposition.Rejected,
            400,
            eventId: null,
            forbidden: ["{", "WebhookSecret", "pdl_ntfset"]);
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

        var started = DateTimeOffset.UtcNow.AddSeconds(-2);
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var row = await AssertDeliveryAsync(
            started,
            PaddleWebhookDeliveryDisposition.Rejected,
            400,
            eventId: null,
            forbidden: ["evt_bad", "deadbeef", "WebhookSecret", "pdl_ntfset", "at "]);
        Assert.Null(row.EventType);
        Assert.True((row.DetailSanitized?.Length ?? 0) <= 200);
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
        Assert.Equal(
            1,
            await db.PaddleWebhookDeliveries.CountAsync(item =>
                item.EventId == eventId && item.Disposition == PaddleWebhookDeliveryDisposition.Processed));
        Assert.Equal(
            1,
            await db.PaddleWebhookDeliveries.CountAsync(item =>
                item.EventId == eventId && item.Disposition == PaddleWebhookDeliveryDisposition.Duplicate));
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
        Assert.Equal(
            1,
            await db.PaddleWebhookDeliveries.CountAsync(item =>
                item.EventId == eventId && item.Disposition == PaddleWebhookDeliveryDisposition.Retryable && item.HttpStatus == 503));
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
        var started = DateTimeOffset.UtcNow.AddSeconds(-2);
        using var response = await PostSignedAsync(client, """{"event_type":"subscription.updated","data":{}}""");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertDeliveryAsync(
            started,
            PaddleWebhookDeliveryDisposition.Rejected,
            400,
            eventId: null,
            forbidden: ["subscription.updated"]);
    }

    [SkippableFact]
    public async Task Webhook_malformed_json_stays_400_without_raw_body()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        const string malformed = """{"event_id":"evt_bad_json", "email":"victim-44-5@example.com",""";
        var started = DateTimeOffset.UtcNow.AddSeconds(-2);
        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, malformed);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertDeliveryAsync(
            started,
            PaddleWebhookDeliveryDisposition.Rejected,
            400,
            eventId: null,
            forbidden: ["evt_bad_json", "victim-44-5@example.com", "{"]);
    }

    [SkippableFact]
    public async Task Webhook_ignored_event_is_200_and_records_ignored_without_ledger()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var eventId = $"evt_ign_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "address.updated",
              "data": { "id": "add_{{eventId}}" }
            }
            """;

        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync(item => item.EventId == eventId));
        var row = Assert.Single(await db.PaddleWebhookDeliveries
            .Where(item => item.EventId == eventId)
            .ToListAsync());
        Assert.Equal(PaddleWebhookDeliveryDisposition.Ignored, row.Disposition);
        Assert.Equal(200, row.HttpStatus);
    }

    [SkippableFact]
    public async Task Webhook_sentinel_payload_is_not_persisted_on_diagnostic_row()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        const string email = "victim-44-5@example.com";
        const string bodySentinel = "CUSTOMER_BODY_SENTINEL_44_5";
        const string jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload445.signature445";
        var eventId = $"evt_sen_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "address.updated",
              "data": {
                "email": "{{email}}",
                "note": "{{bodySentinel}}",
                "token": "{{jwt}}"
              }
            }
            """;

        using var client = Factory.CreateClient();
        using var response = await PostSignedAsync(client, body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var row = Assert.Single(await db.PaddleWebhookDeliveries
            .Where(item => item.EventId == eventId)
            .ToListAsync());
        Assert.DoesNotContain(email, row.DetailSanitized ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain(bodySentinel, row.DetailSanitized ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain(jwt, row.DetailSanitized ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain("{", row.DetailSanitized ?? string.Empty, StringComparison.Ordinal);
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

    private async Task<PaddleWebhookDelivery> AssertDeliveryAsync(
        DateTimeOffset started,
        PaddleWebhookDeliveryDisposition disposition,
        int httpStatus,
        string? eventId,
        string[] forbidden)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var row = await db.PaddleWebhookDeliveries
            .Where(item => item.ObservedAt >= started && item.Disposition == disposition && item.HttpStatus == httpStatus)
            .OrderByDescending(item => item.ObservedAt)
            .FirstOrDefaultAsync();
        Assert.NotNull(row);
        Assert.Equal(eventId, row.EventId);
        foreach (var marker in forbidden)
        {
            Assert.DoesNotContain(marker, row.DetailSanitized ?? string.Empty, StringComparison.Ordinal);
        }

        return row;
    }

    private sealed record WebhookAck(bool Received, bool Processed, bool Duplicate, string? Detail);
}
