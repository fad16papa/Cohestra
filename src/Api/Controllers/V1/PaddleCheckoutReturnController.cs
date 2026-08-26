using Cohestra.Application.Billing;
using Cohestra.Contracts.Billing;
using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/system/paddle")]
public sealed class PaddleCheckoutReturnController(
    IPaddleCheckoutReturnResolver checkoutReturnResolver,
    IBillingService billingService,
    ILogger<PaddleCheckoutReturnController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("checkout-return")]
    [ProducesResponseType(typeof(PaddleCheckoutReturnResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CheckoutReturn(
        [FromQuery] string? transactionId,
        [FromQuery(Name = "_ptxn")] string? ptxn,
        CancellationToken cancellationToken)
    {
        var id = string.IsNullOrWhiteSpace(transactionId) ? ptxn : transactionId;
        var resolved = string.IsNullOrWhiteSpace(id)
            ? null
            : await checkoutReturnResolver.ResolveDashboardUrlAsync(id, cancellationToken);
        if (resolved is null)
        {
            return NotFound();
        }

        try
        {
            await billingService.SyncFromProviderAsync(resolved.TenantId, id, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(
                ex,
                "Paddle checkout return synced tenant {TenantId} from {TransactionId} failed; dashboard can retry",
                resolved.TenantId,
                id);
        }

        var accept = Request.Headers.Accept.ToString();
        if (accept.Contains("application/json", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new PaddleCheckoutReturnResponse(resolved.RedirectUrl));
        }

        return Redirect(resolved.RedirectUrl);
    }
}
