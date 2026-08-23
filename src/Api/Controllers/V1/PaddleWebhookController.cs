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

        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        if (!PaddleSignature.TryValidate(webhookSecret, signatureHeader, json, DateTimeOffset.UtcNow, out var reason))
        {
            logger.LogWarning("Paddle webhook signature rejected: {Reason}", reason);
            return BadRequest("Invalid Paddle-Signature.");
        }

        var result = await webhookProcessor.ProcessAsync(json, cancellationToken);
        if (result.Duplicate)
        {
            return Ok(new { received = true, duplicate = true });
        }

        return Ok(new { received = true, processed = result.Processed, detail = result.Detail });
    }
}
