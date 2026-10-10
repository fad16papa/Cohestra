using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsPaddleIntegrationTests(IntegrationTestFixture fixture)
{
    private const string CustomerEmailSentinel = "victim-44-5@example.com";
    private const string CustomerBodySentinel = "CUSTOMER_BODY_SENTINEL_44_5";
    private const string SignatureSentinel = "ts=1;h1=deadbeef44";
    private const string SecretSentinel = "pdl_ntfset_secret_44_5";
    private const string JwtSentinel = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload445.signature445";

    private static readonly string[] AllowedItemProperties =
    [
        "id",
        "eventId",
        "eventType",
        "disposition",
        "tenantId",
        "httpStatus",
        "detailSanitized",
        "observedAt",
    ];

    private static readonly string[] AllowedConfigProperties =
    [
        "isConfigured",
        "environment",
        "allowLive",
        "apiHost",
    ];

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_config_is_allow_listed_and_omits_secrets()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var response = await client.GetAsync("/api/v1/platform/ops/paddle/config");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("ApiKey", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("WebhookSecret", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ClientToken", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("PriceCore", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("pri_", json, StringComparison.OrdinalIgnoreCase);

        using var document = JsonDocument.Parse(json);
        Assert.Equal(
            AllowedConfigProperties.OrderBy(name => name, StringComparer.Ordinal),
            document.RootElement.EnumerateObject().Select(property => property.Name).OrderBy(name => name, StringComparer.Ordinal));

        var config = JsonSerializer.Deserialize<PlatformOpsPaddleConfigResponse>(
            json,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(config);
        Assert.False(string.IsNullOrWhiteSpace(config.Environment));
        Assert.False(string.IsNullOrWhiteSpace(config.ApiHost));
        Assert.StartsWith("https://", config.ApiHost, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Deliveries_paginate_filter_and_omit_payloads()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        await SeedDeliveriesAsync(
            Row(tenantA, PaddleWebhookDeliveryDisposition.Rejected, "transaction.completed", DateTimeOffset.Parse("2026-06-02T00:00:00Z"), "Invalid Paddle-Signature."),
            Row(tenantA, PaddleWebhookDeliveryDisposition.Processed, "transaction.completed", DateTimeOffset.Parse("2026-06-02T00:00:00Z"), "Processed."),
            Row(tenantB, PaddleWebhookDeliveryDisposition.Rejected, "transaction.completed", DateTimeOffset.Parse("2026-06-02T00:00:00Z"), "Invalid Paddle-Signature."),
            Row(tenantA, PaddleWebhookDeliveryDisposition.Rejected, "subscription.updated", DateTimeOffset.Parse("2026-01-01T00:00:00Z"), "Invalid JSON."));

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var response = await client.GetAsync(
            $"/api/v1/platform/ops/paddle/deliveries?disposition=rejected&eventType=transaction.completed&tenantId={tenantA}&from=2026-03-01T00:00:00Z&to=2026-06-30T23:59:59Z");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        AssertForbiddenSentinels(json);

        var list = JsonSerializer.Deserialize<PlatformOpsPaddleDeliveryListResponse>(
            json,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        var item = Assert.Single(list.Items);
        Assert.Equal("Rejected", item.Disposition);
        Assert.Equal(tenantA, item.TenantId);
        using var document = JsonDocument.Parse(json);
        var itemProps = document.RootElement.GetProperty("items")[0].EnumerateObject()
            .Select(property => property.Name)
            .OrderBy(name => name, StringComparer.Ordinal);
        Assert.Equal(AllowedItemProperties.OrderBy(name => name, StringComparer.Ordinal), itemProps);

        using var badDisposition = await client.GetAsync("/api/v1/platform/ops/paddle/deliveries?disposition=failed");
        Assert.Equal(HttpStatusCode.BadRequest, badDisposition.StatusCode);

        using var inverted = await client.GetAsync(
            "/api/v1/platform/ops/paddle/deliveries?from=2026-04-02T00:00:00Z&to=2026-04-01T00:00:00Z");
        Assert.Equal(HttpStatusCode.BadRequest, inverted.StatusCode);

        using var clamped = await client.GetAsync("/api/v1/platform/ops/paddle/deliveries?pageSize=100");
        Assert.Equal(HttpStatusCode.OK, clamped.StatusCode);
        var clampedList = await clamped.Content.ReadFromJsonAsync<PlatformOpsPaddleDeliveryListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(clampedList);
        Assert.Equal(50, clampedList.PageSize);
        Assert.True(clampedList.Items.Count <= 50);
    }

    [SkippableFact]
    public async Task Replay_route_does_not_exist()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var response = await client.PostAsync(
            $"/api/v1/platform/ops/paddle/{Guid.CreateVersion7()}/replay",
            content: null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task Anonymous_config_and_deliveries_are_401()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var config = await client.GetAsync("/api/v1/platform/ops/paddle/config");
        using var list = await client.GetAsync("/api/v1/platform/ops/paddle/deliveries");
        Assert.Equal(HttpStatusCode.Unauthorized, config.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
    }

    private async Task SeedDeliveriesAsync(params PaddleWebhookDelivery[] rows)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        db.PaddleWebhookDeliveries.AddRange(rows);
        await db.SaveChangesAsync();
    }

    private static PaddleWebhookDelivery Row(
        Guid tenantId,
        PaddleWebhookDeliveryDisposition disposition,
        string eventType,
        DateTimeOffset observedAt,
        string detail) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            EventId = $"evt_{Guid.NewGuid():N}",
            EventType = eventType,
            Disposition = disposition,
            TenantId = tenantId,
            HttpStatus = disposition == PaddleWebhookDeliveryDisposition.Rejected ? 400 : 200,
            DetailSanitized = detail.Length <= 200 ? detail : detail[..200],
            ObservedAt = observedAt,
        };

    private static void AssertForbiddenSentinels(string json)
    {
        Assert.DoesNotContain(CustomerEmailSentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain(CustomerBodySentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain(SignatureSentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretSentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain(JwtSentinel, json, StringComparison.Ordinal);
        Assert.DoesNotContain("payloadJson", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("WebhookSecret", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("deadbeef44", json, StringComparison.OrdinalIgnoreCase);
    }
}
