using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Stripe;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/system/stripe")]
public sealed class StripeWebhookController(
    IStripeWebhookProcessor webhookProcessor,
    IOptions<StripeSettings> stripeOptions,
    ILogger<StripeWebhookController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        var webhookSecret = stripeOptions.Value.WebhookSecret;
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Stripe webhook secret is not configured.");
        }

        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        var signatureHeader = Request.Headers["Stripe-Signature"].ToString();
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return BadRequest("Missing Stripe-Signature header.");
        }

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe webhook signature verification failed.");
            return BadRequest("Invalid Stripe webhook signature.");
        }

        var result = await webhookProcessor.ProcessAsync(stripeEvent, cancellationToken);
        if (result.Duplicate)
        {
            return Ok(new { received = true, duplicate = true });
        }

        return Ok(new { received = true, processed = result.Processed, detail = result.Detail });
    }
}
