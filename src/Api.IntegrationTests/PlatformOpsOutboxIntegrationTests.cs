using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsOutboxIntegrationTests(IntegrationTestFixture fixture)
{
    private const string CustomerBodySentinel = "CUSTOMER_BODY_SENTINEL_44_4";
    private const string CustomerEmailSentinel = "victim-44-4@example.com";
    private const string JwtSentinel = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload44.signature44";

    private static readonly string[] AllowedItemProperties =
    [
        "id",
        "tenantId",
        "messageType",
        "status",
        "attemptCount",
        "createdAt",
        "nextAttemptAt",
        "processedAt",
        "claimedAt",
        "dispatchedAt",
        "lastErrorSanitized",
    ];

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_summary_and_list_are_actual_and_paginated()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantId = TenantIds.Default;
        var stamp = Guid.NewGuid().ToString("N")[..8];
        await SeedOutboxAsync(
            CreateRow(tenantId, OutboxMessageStatus.Failed, $"campaign.recipient", stamp, DateTimeOffset.UtcNow),
            CreateRow(tenantId, OutboxMessageStatus.Pending, $"registration.confirmation", stamp, DateTimeOffset.UtcNow));

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var summaryResponse = await client.GetAsync("/api/v1/platform/ops/outbox/summary");
        Assert.Equal(HttpStatusCode.OK, summaryResponse.StatusCode);
        var summary = await summaryResponse.Content.ReadFromJsonAsync<PlatformOpsOutboxSummaryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(summary);
        Assert.Equal(PlatformKpiFreshness.Actual, summary.CountsByStatus.Freshness);
        Assert.Equal(PlatformOpsOutboxSources.OutboxMessages, summary.CountsByStatus.Source);
        Assert.Equal(TimeSpan.Zero, summary.CountsByStatus.ObservedAt.Offset);
        Assert.Contains(summary.CountsByStatus.Value!, row => row.Key == "Failed" && row.Count >= 1);
        Assert.Contains(summary.CountsByStatus.Value!, row => row.Key == "Processing");
        Assert.Equal(PlatformKpiFreshness.Actual, summary.CountsByMessageType.Freshness);

        using var listResponse = await client.GetAsync("/api/v1/platform/ops/outbox?status=Failed&page=1");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var list = await listResponse.Content.ReadFromJsonAsync<PlatformOpsOutboxListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(25, list.PageSize);
        Assert.Equal(1, list.Page);
        Assert.True(list.TotalCount >= 1);
        Assert.Contains(list.Items, item => item.Status == "Failed");
    }

    [SkippableFact]
    public async Task Anonymous_outbox_is_unauthorized()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var summary = await client.GetAsync("/api/v1/platform/ops/outbox/summary");
        using var list = await client.GetAsync("/api/v1/platform/ops/outbox");
        Assert.Equal(HttpStatusCode.Unauthorized, summary.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
    }

    [SkippableFact]
    public async Task PayloadJson_and_customer_body_are_absent_from_list_json()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var id = Guid.CreateVersion7();
        await SeedOutboxAsync(new OutboxMessage
        {
            Id = id,
            TenantId = TenantIds.Default,
            MessageType = OutboxMessageTypes.CampaignRecipient,
            PayloadJson =
                $$"""{"to":"{{CustomerEmailSentinel}}","subject":"Offer","body":"{{CustomerBodySentinel}} MIME-Version: 1.0\n{{JwtSentinel}}"}""",
            DedupeKey = $"sensitive-{id:N}",
            Status = OutboxMessageStatus.Failed,
            AttemptCount = 5,
            CreatedAt = DateTimeOffset.UtcNow,
            NextAttemptAt = DateTimeOffset.UtcNow,
            LastError = "Send failed Password=super-secret-44-4 Host=db.internal Bearer leaked.token redis://:hunter2@cache:6379 " + CustomerEmailSentinel,
        });

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync($"/api/v1/platform/ops/outbox?status=Failed&tenantId={TenantIds.Default}&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("payloadJson", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dedupeKey", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"lastError\"", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(CustomerBodySentinel, body, StringComparison.Ordinal);
        Assert.DoesNotContain("MIME-Version", body, StringComparison.Ordinal);
        Assert.DoesNotContain(CustomerEmailSentinel, body, StringComparison.Ordinal);
        Assert.DoesNotContain(JwtSentinel, body, StringComparison.Ordinal);
        Assert.DoesNotContain("super-secret-44-4", body, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", body, StringComparison.Ordinal);
        Assert.DoesNotContain("leaked.token", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);

        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.GetProperty("items");
        JsonElement? match = null;
        foreach (var item in items.EnumerateArray())
        {
            if (item.GetProperty("id").GetGuid() == id)
            {
                match = item;
                break;
            }
        }

        Assert.True(match.HasValue);
        var names = match.Value.EnumerateObject().Select(property => property.Name).OrderBy(name => name).ToArray();
        Assert.Equal(AllowedItemProperties.OrderBy(name => name).ToArray(), names);
        var sanitized = match.Value.GetProperty("lastErrorSanitized").GetString();
        Assert.NotNull(sanitized);
        Assert.True(sanitized!.Length <= 200);
        Assert.Contains("[redacted]", sanitized, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Filters_status_messageType_createdAt_and_reject_invalid_inputs()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var stamp = DateTimeOffset.Parse("2026-03-15T12:00:00Z");
        var type = $"support.issue.tech";
        await SeedOutboxAsync(
            CreateRow(TenantIds.Default, OutboxMessageStatus.Failed, type, "in-window", stamp),
            CreateRow(TenantIds.Default, OutboxMessageStatus.Completed, type, "completed", stamp),
            CreateRow(TenantIds.Default, OutboxMessageStatus.Failed, OutboxMessageTypes.CampaignRecipient, "other-type", stamp),
            CreateRow(TenantIds.Default, OutboxMessageStatus.Failed, type, "old", stamp.AddDays(-10)));

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var filtered = await client.GetAsync(
            $"/api/v1/platform/ops/outbox?status=Failed&messageType={type}&from=2026-03-01T00:00:00Z&to=2026-03-31T23:59:59Z");
        Assert.Equal(HttpStatusCode.OK, filtered.StatusCode);
        var list = await filtered.Content.ReadFromJsonAsync<PlatformOpsOutboxListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.All(list.Items, item =>
        {
            Assert.Equal("Failed", item.Status);
            Assert.Equal(type, item.MessageType);
            Assert.True(item.CreatedAt >= DateTimeOffset.Parse("2026-03-01T00:00:00Z"));
            Assert.True(item.CreatedAt <= DateTimeOffset.Parse("2026-03-31T23:59:59Z"));
        });
        Assert.Contains(list.Items, item => item.MessageType == type);

        using var badStatus = await client.GetAsync("/api/v1/platform/ops/outbox?status=DeadLetter");
        Assert.Equal(HttpStatusCode.BadRequest, badStatus.StatusCode);
        var statusProblem = await badStatus.Content.ReadAsStringAsync();
        Assert.Contains("Pending", statusProblem, StringComparison.Ordinal);

        using var badRange = await client.GetAsync(
            "/api/v1/platform/ops/outbox?from=2026-04-02T00:00:00Z&to=2026-04-01T00:00:00Z");
        Assert.Equal(HttpStatusCode.BadRequest, badRange.StatusCode);
        var rangeProblem = await badRange.Content.ReadAsStringAsync();
        Assert.Contains("CreatedAt", rangeProblem, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task PageSize_clamps_at_50_and_empty_list_is_200()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var clamped = await client.GetAsync("/api/v1/platform/ops/outbox?pageSize=100");
        Assert.Equal(HttpStatusCode.OK, clamped.StatusCode);
        var list = await clamped.Content.ReadFromJsonAsync<PlatformOpsOutboxListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(50, list.PageSize);
        Assert.True(list.Items.Count <= 50);

        using var empty = await client.GetAsync(
            $"/api/v1/platform/ops/outbox?tenantId={Guid.CreateVersion7()}&status=Failed");
        Assert.Equal(HttpStatusCode.OK, empty.StatusCode);
        var emptyList = await empty.Content.ReadFromJsonAsync<PlatformOpsOutboxListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(emptyList);
        Assert.Empty(emptyList.Items);
        Assert.Equal(0, emptyList.TotalCount);
    }

    [SkippableFact]
    public async Task Requeue_route_does_not_exist()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var response = await client.PostAsync(
            $"/api/v1/platform/ops/outbox/{Guid.CreateVersion7()}/requeue",
            content: null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task SeedOutboxAsync(params OutboxMessage[] rows)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        db.OutboxMessages.AddRange(rows);
        await db.SaveChangesAsync();
    }

    private static OutboxMessage CreateRow(
        Guid tenantId,
        OutboxMessageStatus status,
        string messageType,
        string stamp,
        DateTimeOffset createdAt) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            MessageType = messageType,
            PayloadJson = $"{{\"stamp\":\"{stamp}\",\"body\":\"{CustomerBodySentinel}\"}}",
            Status = status,
            AttemptCount = 1,
            CreatedAt = createdAt,
            NextAttemptAt = createdAt,
        };
}
