using Cohestra.Application.Billing;
using Cohestra.Contracts.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/system/paddle")]
public sealed class PaddleCheckoutReturnController(
    IPaddleCheckoutReturnResolver checkoutReturnResolver,
    IBillingService billingService,
    IOptions<PublicWebOptions> publicWebOptions,
    IOptions<PaddleSettings> paddleOptions,
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

        BillingSummaryDto summary;
        try
        {
            summary = await billingService.SyncFromProviderAsync(resolved.TenantId, id, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(
                ex,
                "Paddle checkout return synced tenant {TenantId} from {TransactionId} failed; dashboard can retry",
                resolved.TenantId,
                id);
            summary = await billingService.GetSummaryAsync(resolved.TenantId, cancellationToken);
        }

        var paid = summary.Plan is TenantPlan.Core or TenantPlan.Pro;
        var redirectUrl = PaddleCheckoutReturnRedirect.Build(
            publicWebOptions.Value.BaseUrl,
            resolved.TenantSlug,
            id!,
            paid);
        var clientToken = string.IsNullOrWhiteSpace(paddleOptions.Value.ClientToken)
            ? null
            : paddleOptions.Value.ClientToken.Trim();
        var openCheckout = PaddleCheckoutReturnRedirect.ShouldOpenCheckout(paid, clientToken);

        var accept = Request.Headers.Accept.ToString();
        if (accept.Contains("application/json", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(
                new PaddleCheckoutReturnResponse(
                    redirectUrl,
                    summary.Plan.ToString(),
                    summary.BillingStatus.ToString(),
                    openCheckout,
                    openCheckout ? clientToken : null));
        }

        return Redirect(redirectUrl);
    }
}
