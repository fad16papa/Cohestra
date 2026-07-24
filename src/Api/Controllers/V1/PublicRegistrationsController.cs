using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Registrations;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>Anonymous public registration endpoints.</summary>
[ApiController]
[Route("api/v1/public/registrations")]
[AllowAnonymous]
[Produces("application/json")]
[Tags("Public Registrations")]
public class PublicRegistrationsController(
    IRegistrationService registrationService,
    ITenantAccessService tenantAccessService,
    ICurrentTenant currentTenant) : ControllerBase
{
    /// <summary>
    /// Submit a public registration.
    /// </summary>
    /// <remarks>
    /// Persists an immutable registration and creates or updates the master client record.
    /// Optional <c>Idempotency-Key</c> header replays the original 201 response on retry.
    /// Contract: docs/contracts/public-registration-v1.md
    /// </remarks>
    [EndpointSummary("Submit a public registration")]
    [EndpointDescription(
        "Persists an immutable registration linked to the activity and creates or updates " +
        "the master client record. Supports optional Idempotency-Key for safe retries. " +
        "Contract: docs/contracts/public-registration-v1.md")]
    [HttpPost]
    [ProducesResponseType(typeof(SubmitPublicRegistrationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SubmitPublicRegistrationResponse>> Submit(
        [FromBody] SubmitPublicRegistrationRequest? request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (request is null ||
            string.IsNullOrWhiteSpace(request.ActivitySlug) ||
            request.Answers is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid registration payload",
                Detail = "activitySlug and answers are required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        if (currentTenant.IsResolved && currentTenant.TenantId is Guid tenantId)
        {
            var access = await tenantAccessService.EvaluateAsync(tenantId, cancellationToken);
            if (!access.PublicRegistrationAllowed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
                {
                    Title = "Registration unavailable",
                    Detail = "Public registration is temporarily unavailable for this workspace.",
                    Status = StatusCodes.Status403Forbidden,
                    Extensions = { ["errorCode"] = "registration_blocked" },
                });
            }
        }

        var result = await registrationService.SubmitPublicRegistrationAsync(
            request.ActivitySlug,
            request.Answers,
            idempotencyKey,
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (result.IsIdempotencyConflict)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Idempotency-Key conflict",
                Detail = "This Idempotency-Key was already used with a different registration payload.",
                Status = StatusCodes.Status409Conflict,
            });
        }

        if (result.IsAlreadyRegistered)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Already registered",
                Detail = "You are already registered for this activity.",
                Status = StatusCodes.Status409Conflict,
                Extensions =
                {
                    ["registrationId"] = result.RegistrationId,
                    ["registrationNumber"] = result.RegistrationNumber,
                    ["clientId"] = result.ClientId,
                },
            });
        }

        if (result.ValidationError is not null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid registration answers",
                Detail = result.ValidationError,
                Status = StatusCodes.Status400BadRequest,
            });
        }

        if (currentTenant.IsResolved && currentTenant.TenantId is Guid tenantIdForActivity)
        {
            await tenantAccessService.TouchActivityAsync(tenantIdForActivity, cancellationToken);
        }

        var response = new SubmitPublicRegistrationResponse(
            Status: "created",
            Message: "Registration complete. Thank you!",
            RegistrationId: result.RegistrationId,
            RegistrationNumber: result.RegistrationNumber,
            ClientId: result.ClientId,
            ConfirmationEmailSent: result.ConfirmationEmailSent,
            ConfirmationEmail: result.ConfirmationEmail);

        return StatusCode(StatusCodes.Status201Created, response);
    }
}
