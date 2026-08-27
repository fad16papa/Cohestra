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
/// Tenant Admin billing — Core/Pro checkout (Epic 14 process; Paddle from Story 29.1).
/// Policy name <see cref="TenantAuthPolicies.TenantAdminOnly"/> must be preserved.
/// </summary>
[ApiController]
[Route("api/v1/admin/billing")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public class BillingController(
    IBillingService billingService,
    ICurrentTenant currentTenant,
    IOptions<PaddleSettings> paddleOptions) : ControllerBase
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

        var denied = await EnsureBillingAccessAsync(tenantId, cancellationToken);
        if (denied is not null)
        {
            return denied;
        }

        var summary = await billingService.GetSummaryAsync(tenantId, cancellationToken);
        return Ok(MapSummary(summary));
    }

    [HttpPost("sync")]
    [ProducesResponseType(typeof(BillingSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<BillingSummaryResponse>> Sync(
        [FromBody] SyncBillingRequest? request,
        CancellationToken cancellationToken)
    {
        if (!paddleOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Paddle is not configured in this environment.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                });
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var denied = await EnsureBillingAccessAsync(tenantId, cancellationToken);
        if (denied is not null)
        {
            return denied;
        }

        var summary = await billingService.SyncFromProviderAsync(
            tenantId,
            request?.CheckoutSessionId,
            cancellationToken);
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
        if (!paddleOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Paddle Checkout is not configured in this environment.",
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

        var denied = await EnsureBillingAccessAsync(tenantId, cancellationToken);
        if (denied is not null)
        {
            return denied;
        }

        var email = GetOperatorEmail() ?? string.Empty;

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
            ? $"{tenantBase}/dashboard?billing=success&session_id={{CHECKOUT_SESSION_ID}}"
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
                session.TrialDisclaimer,
                session.CompletedInApp,
                session.Warnings));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Checkout unavailable",
                Detail = ex.Message,
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
        if (!paddleOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Paddle Customer Portal is not configured in this environment.",
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

    [HttpGet("details")]
    [ProducesResponseType(typeof(BillingDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BillingDetailsResponse>> GetDetails(CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var operatorEmail = GetOperatorEmail() ?? string.Empty;
        try
        {
            var details = await billingService.GetDetailsAsync(tenantId, operatorEmail, cancellationToken);
            return Ok(MapDetails(details));
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
    }

    [HttpPatch("contact")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> UpdateContact(
        [FromBody] UpdateBillingContactRequest? request,
        CancellationToken cancellationToken)
    {
        if (!paddleOptions.Value.IsConfigured)
        {
            return BillingUnavailable();
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        try
        {
            await billingService.UpdateBillingContactAsync(
                tenantId,
                GetOperatorEmail() ?? string.Empty,
                request?.Name,
                request?.Email,
                request?.PhoneCountry,
                request?.PhoneLocal,
                cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
        catch (InvalidOperationException ex)
        {
            return BillingBadRequest("Billing contact unavailable", ex.Message);
        }
    }

    [HttpPost("subscription/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CancelSubscription(CancellationToken cancellationToken)
    {
        if (!paddleOptions.Value.IsConfigured)
        {
            return BillingUnavailable();
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        try
        {
            await billingService.CancelSubscriptionAtPeriodEndAsync(
                tenantId,
                GetOperatorEmail() ?? string.Empty,
                cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
        catch (InvalidOperationException ex)
        {
            return BillingBadRequest("Subscription update unavailable", ex.Message);
        }
    }

    [HttpPost("subscription/resume")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> ResumeSubscription(CancellationToken cancellationToken)
    {
        if (!paddleOptions.Value.IsConfigured)
        {
            return BillingUnavailable();
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        try
        {
            await billingService.ResumeSubscriptionAsync(
                tenantId,
                GetOperatorEmail() ?? string.Empty,
                cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
        catch (InvalidOperationException ex)
        {
            return BillingBadRequest("Subscription update unavailable", ex.Message);
        }
    }

    [HttpPost("subscription/cancel-scheduled-change")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CancelScheduledPlanChange(CancellationToken cancellationToken)
    {
        if (!paddleOptions.Value.IsConfigured)
        {
            return BillingUnavailable();
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        try
        {
            await billingService.CancelScheduledPlanChangeAsync(
                tenantId,
                GetOperatorEmail() ?? string.Empty,
                cancellationToken);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
        catch (InvalidOperationException ex)
        {
            return BillingBadRequest("Subscription update unavailable", ex.Message);
        }
    }

    private string? GetOperatorEmail() =>
        User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

    private async Task<ActionResult?> EnsureBillingAccessAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        try
        {
            await billingService.ValidateBillingAccessAsync(tenantId, GetOperatorEmail(), cancellationToken);
            return null;
        }
        catch (UnauthorizedAccessException ex)
        {
            return BillingAccessDenied(ex);
        }
    }

    private ObjectResult BillingAccessDenied(UnauthorizedAccessException ex) =>
        StatusCode(
            StatusCodes.Status403Forbidden,
            new ProblemDetails
            {
                Title = "Billing restricted",
                Detail = ex.Message,
                Status = StatusCodes.Status403Forbidden,
            });

    private ObjectResult BillingUnavailable() =>
        StatusCode(
            StatusCodes.Status503ServiceUnavailable,
            new ProblemDetails
            {
                Title = "Billing unavailable",
                Detail = "Paddle is not configured in this environment.",
                Status = StatusCodes.Status503ServiceUnavailable,
            });

    private BadRequestObjectResult BillingBadRequest(string title, string detail) =>
        BadRequest(new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = StatusCodes.Status400BadRequest,
        });

    private static BillingDetailsResponse MapDetails(BillingDetailsDto details) =>
        new(
            MapSummary(details.Summary),
            details.Contact is null
                ? null
                : new BillingContactResponse(details.Contact.Name, details.Contact.Email, details.Contact.Phone),
            details.PaymentMethod is null
                ? null
                : new BillingPaymentMethodResponse(
                    details.PaymentMethod.Id,
                    details.PaymentMethod.Brand,
                    details.PaymentMethod.Last4,
                    details.PaymentMethod.ExpMonth,
                    details.PaymentMethod.ExpYear),
            details.Subscription is null
                ? null
                : new BillingSubscriptionDetailsResponse(
                    details.Subscription.CancelAtPeriodEnd,
                    details.Subscription.CurrentPeriodEnd,
                    details.Subscription.ScheduledPlan,
                    details.Subscription.ScheduledPlanEffectiveAt),
            details.Invoices
                .Select(invoice => new BillingInvoiceResponse(
                    invoice.Id,
                    invoice.CreatedAt,
                    invoice.AmountDueCents,
                    invoice.Currency,
                    invoice.Status,
                    invoice.PdfUrl,
                    invoice.HostedInvoiceUrl))
                .ToList());

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
            summary.BillingConfigured,
            summary.ClientToken,
            summary.TrialPeriodDays,
            summary.IsComplimentary,
            summary.Usage is null
                ? null
                : new BillingUsageResponse(
                    summary.Usage.SeatsUsed,
                    summary.Usage.Communities,
                    summary.Usage.PublishedActivities,
                    summary.Usage.RegistrationsThisMonth),
            summary.CoreLimits is null
                ? null
                : new BillingPlanLimitsResponse(
                    summary.CoreLimits.Seats,
                    summary.CoreLimits.Communities,
                    summary.CoreLimits.PublishedActivities,
                    summary.CoreLimits.RegistrationsPerMonth),
            summary.ProLimits is null
                ? null
                : new BillingPlanLimitsResponse(
                    summary.ProLimits.Seats,
                    summary.ProLimits.Communities,
                    summary.ProLimits.PublishedActivities,
                    summary.ProLimits.RegistrationsPerMonth),
            summary.ScheduledPlan?.ToString(),
            summary.ScheduledPlanEffectiveAt,
            summary.ScheduledBillingInterval?.ToString());

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
