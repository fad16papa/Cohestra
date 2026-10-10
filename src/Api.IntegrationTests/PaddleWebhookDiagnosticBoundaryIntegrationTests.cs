using System.Net;
using System.Text;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(PaddleWebhookIntegrationCollection.Name)]
public sealed class PaddleWebhookDiagnosticBoundaryIntegrationTests(PaddleWebhookIntegrationFixture fixture)
{
    private PaddleWebhookWebApplicationFactory SharedFactory => fixture.Factory;

    [SkippableFact]
    public async Task Missing_secret_stays_503_and_records_rejected()
    {
        IntegrationTestHelpers.SkipIfUnavailable(SharedFactory);
        await using var factory = new PaddleWebhookMissingSecretWebApplicationFactory();
        await factory.InitializeAsync();
        IntegrationTestHelpers.SkipIfUnavailable(factory);

        var started = DateTimeOffset.UtcNow.AddSeconds(-2);
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/system/paddle/webhook")
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation("Paddle-Signature", "ts=1;h1=deadbeef");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var row = await db.PaddleWebhookDeliveries
            .Where(item => item.ObservedAt >= started && item.Disposition == PaddleWebhookDeliveryDisposition.Rejected)
            .OrderByDescending(item => item.ObservedAt)
            .FirstAsync();
        Assert.Equal(503, row.HttpStatus);
        Assert.Null(row.EventId);
        Assert.DoesNotContain("pdl_ntfset", row.DetailSanitized ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("WebhookSecret", row.DetailSanitized ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task Diagnostic_writer_failure_preserves_webhook_http_status()
    {
        IntegrationTestHelpers.SkipIfUnavailable(SharedFactory);
        await using var factory = new PaddleWebhookThrowingDiagnosticWebApplicationFactory();
        await factory.InitializeAsync();
        IntegrationTestHelpers.SkipIfUnavailable(factory);

        var eventId = $"evt_diag_{Guid.NewGuid():N}";
        var body = $$"""
            {
              "event_id": "{{eventId}}",
              "event_type": "address.updated",
              "data": { "id": "add_{{eventId}}" }
            }
            """;

        using var client = factory.CreateClient();
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header =
            $"ts={ts};h1={PaddleSignature.ComputeHexHmac(PaddleWebhookWebApplicationFactory.WebhookSecret, $"{ts}:{body}")}";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/system/paddle/webhook")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation("Paddle-Signature", header);
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        Assert.Equal(0, await db.PaddleWebhookEvents.CountAsync(item => item.EventId == eventId));
        Assert.Equal(0, await db.PaddleWebhookDeliveries.CountAsync(item => item.EventId == eventId));
    }
}
