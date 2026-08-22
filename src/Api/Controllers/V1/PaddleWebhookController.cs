using System.Text.Json;
using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/system/paddle")]
public sealed class PaddleWebhookController(
    IPaddleWebhookProcessor webhookProcessor,
    IOptions<PaddleSettings> paddleOptions,
    ILogger<PaddleWebhookController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        var webhookSecret = paddleOptions.Value.WebhookSecret;
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Paddle webhook secret is not configured.");
        }

        var signatureHeader = Request.Headers["Paddle-Signature"].ToString();
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return BadRequest("Missing Paddle-Signature header.");
        }

        // Signature HMAC verification lands in Story 29.3. Presence check keeps the route wired.
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        var (eventId, eventType) = TryReadEventMeta(json);

        logger.LogDebug("Paddle webhook received ({EventType}, {EventId}).", eventType, eventId);

        var result = await webhookProcessor.ProcessAsync(eventId, eventType, cancellationToken);
        if (result.Duplicate)
        {
            return Ok(new { received = true, duplicate = true });
        }

        return Ok(new { received = true, processed = result.Processed, detail = result.Detail });
    }

    private static (string EventId, string EventType) TryReadEventMeta(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return (string.Empty, string.Empty);
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var eventId = ReadString(root, "event_id") ?? ReadString(root, "notification_id") ?? string.Empty;
            var eventType = ReadString(root, "event_type") ?? string.Empty;
            return (eventId, eventType);
        }
        catch (JsonException)
        {
            return (string.Empty, string.Empty);
        }
    }

    private static string? ReadString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
