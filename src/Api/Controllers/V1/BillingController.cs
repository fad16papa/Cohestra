using System.IdentityModel.Tokens.Jwt;
using Cohestra.Application.Billing;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Tenant Admin billing — Stripe Checkout for Core/Pro (Story 14.4).
/// Policy name <see cref="TenantAuthPolicies.TenantAdminOnly"/> must be preserved.
/// </summary>
[ApiController]
[Route("api/v1/admin/billing")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public class BillingController(
    IBillingService billingService,
    ICurrentTenant currentTenant,
    IOptions<StripeSettings> stripeOptions) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(BillingSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BillingSummaryResponse>> Get(CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var summary = await billingService.GetSummaryAsync(tenantId, cancellationToken);
        return Ok(MapSummary(summary));
    }

    [HttpPost("sync")]
    [ProducesResponseType(typeof(BillingSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<BillingSummaryResponse>> Sync(
        CancellationToken cancellationToken)
    {
        if (!stripeOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Stripe is not configured in this environment.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                });
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var summary = await billingService.SyncFromStripeAsync(tenantId, cancellationToken);
        return Ok(MapSummary(summary));
    }

    [HttpPost("checkout")]
    [ProducesResponseType(typeof(CheckoutSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<CheckoutSessionResponse>> CreateCheckout(
        [FromBody] CreateCheckoutSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!stripeOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Stripe Checkout is not configured in this environment.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                });
        }

        if (!currentTenant.IsResolved
            || currentTenant.TenantId is not Guid tenantId
            || string.IsNullOrWhiteSpace(currentTenant.Slug))
        {
            return Forbid();
        }

        if (!TryParsePlan(request.Plan, out var plan) || plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid plan",
                Detail = "Plan must be Core or Pro.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        if (!TryParseInterval(request.Interval, out var interval))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid interval",
                Detail = "Interval must be monthly or annual.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var email = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
            ?? string.Empty;

        var tenantBase = $"{Request.Scheme}://{Request.Host.Value}";
        if (!string.IsNullOrWhiteSpace(request.SuccessUrl) && !IsAllowedReturnUrl(request.SuccessUrl, tenantBase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid success URL",
                Detail = "Success URL must stay on the current workspace host.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        if (!string.IsNullOrWhiteSpace(request.CancelUrl) && !IsAllowedReturnUrl(request.CancelUrl, tenantBase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid cancel URL",
                Detail = "Cancel URL must stay on the current workspace host.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var successUrl = string.IsNullOrWhiteSpace(request.SuccessUrl)
            ? $"{tenantBase}/dashboard?billing=success"
            : request.SuccessUrl!;
        var cancelUrl = string.IsNullOrWhiteSpace(request.CancelUrl)
            ? $"{tenantBase}/billing/checkout?canceled=1"
            : request.CancelUrl!;

        try
        {
            var session = await billingService.CreateCheckoutSessionAsync(
                new CreateCheckoutSessionCommand(
                    tenantId,
                    currentTenant.Slug,
                    plan,
                    interval,
                    email,
                    successUrl,
                    cancelUrl),
                cancellationToken);

            return Ok(new CheckoutSessionResponse(
                session.CheckoutUrl,
                session.TrialEndsAt,
                session.TrialIncluded,
                session.TrialDisclaimer));
        }
        catch (InvalidOperationException)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Checkout unavailable",
                Detail = "Could not start Stripe Checkout for this workspace.",
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    [HttpPost("portal")]
    [ProducesResponseType(typeof(PortalSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PortalSessionResponse>> CreatePortal(
        [FromBody] CreatePortalSessionRequest? request,
        CancellationToken cancellationToken)
    {
        if (!stripeOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Stripe Customer Portal is not configured in this environment.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                });
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var tenantBase = $"{Request.Scheme}://{Request.Host.Value}";
        var returnUrl = string.IsNullOrWhiteSpace(request?.ReturnUrl)
            ? $"{tenantBase}/settings/billing"
            : request!.ReturnUrl!;

        if (!IsAllowedReturnUrl(returnUrl, tenantBase))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid return URL",
                Detail = "Return URL must stay on the current workspace host.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        try
        {
            var session = await billingService.CreatePortalSessionAsync(
                new CreatePortalSessionCommand(tenantId, returnUrl),
                cancellationToken);
            return Ok(new PortalSessionResponse(session.PortalUrl));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Portal unavailable",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    private static bool IsAllowedReturnUrl(string url, string tenantBase)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var returnUri)
            || !Uri.TryCreate(tenantBase, UriKind.Absolute, out var baseUri))
        {
            return false;
        }

        return string.Equals(returnUri.Scheme, baseUri.Scheme, StringComparison.OrdinalIgnoreCase)
            && string.Equals(returnUri.Host, baseUri.Host, StringComparison.OrdinalIgnoreCase);
    }

    private static BillingSummaryResponse MapSummary(BillingSummaryDto summary) =>
        new(
            summary.Plan.ToString(),
            summary.BillingStatus.ToString(),
            summary.BillingInterval?.ToString(),
            summary.TrialEndsAt,
            summary.HasConsumedTrial,
            summary.StripeConfigured,
            summary.PublishableKey,
            summary.TrialPeriodDays,
            summary.IsComplimentary);

    private static bool TryParsePlan(string? value, out TenantPlan plan)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            plan = TenantPlan.Basic;
            return false;
        }

        return Enum.TryParse(value, ignoreCase: true, out plan);
    }

    private static bool TryParseInterval(string? value, out BillingInterval interval)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            interval = BillingInterval.Monthly;
            return false;
        }

        var normalized = value.Trim().ToLowerInvariant();
        if (normalized is "monthly" or "month")
        {
            interval = BillingInterval.Monthly;
            return true;
        }

        if (normalized is "annual" or "yearly" or "year")
        {
            interval = BillingInterval.Annual;
            return true;
        }

        return Enum.TryParse(value, ignoreCase: true, out interval);
    }
}
