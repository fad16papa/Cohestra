using Cohestra.Application.Tenants;
using Cohestra.Contracts.Admin;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/tenant")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public sealed class AdminTenantController(
    ICurrentTenant currentTenant,
    ITenantOrganizationService tenantOrganizationService) : ControllerBase
{
    [HttpGet("registration-timezone")]
    [ProducesResponseType(typeof(TenantRegistrationTimeZoneResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TenantRegistrationTimeZoneResponse>> GetRegistrationTimeZone(
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var response = await tenantOrganizationService.GetRegistrationTimeZoneAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(response);
    }

    [HttpPatch("registration-timezone")]
    [ProducesResponseType(typeof(TenantRegistrationTimeZoneResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantRegistrationTimeZoneResponse>> UpdateRegistrationTimeZone(
        [FromBody] UpdateTenantRegistrationTimeZoneRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.RegistrationTimeZoneId))
        {
            return BadRequestProblem("RegistrationTimeZoneId is required.");
        }

        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var (ok, error) = await tenantOrganizationService.UpdateRegistrationTimeZoneAsync(
            tenantId.Value,
            request.RegistrationTimeZoneId,
            cancellationToken);
        if (!ok)
        {
            return BadRequestProblem(error ?? "Could not update registration timezone.");
        }

        var response = await tenantOrganizationService.GetRegistrationTimeZoneAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(response);
    }

    [HttpGet("notifications")]
    [ProducesResponseType(typeof(TenantNotificationSettingsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TenantNotificationSettingsResponse>> GetNotificationSettings(
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var response = await tenantOrganizationService.GetNotificationSettingsAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(response);
    }

    [HttpPatch("notifications")]
    [ProducesResponseType(typeof(TenantNotificationSettingsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantNotificationSettingsResponse>> UpdateNotificationSettings(
        [FromBody] UpdateTenantNotificationSettingsRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var response = await tenantOrganizationService.UpdateNotificationSettingsAsync(
            tenantId.Value,
            request.EmailOnNewRegistration,
            cancellationToken);
        return Ok(response);
    }

    private ActionResult BadRequestProblem(string detail) =>
        Problem(detail: detail, statusCode: StatusCodes.Status400BadRequest, title: "Validation failed");
}
