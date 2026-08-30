using Cohestra.Application.Tenants;
using Cohestra.Contracts.Admin;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/tenant")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public sealed class AdminTenantEmbedController(
    ICurrentTenant currentTenant,
    ITenantOrganizationService tenantOrganizationService) : ControllerBase
{
    [HttpGet("embed-settings")]
    [ProducesResponseType(typeof(TenantEmbedSettingsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TenantEmbedSettingsResponse>> GetEmbedSettings(
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var response = await tenantOrganizationService.GetEmbedSettingsAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(response);
    }

    [HttpPatch("embed-settings")]
    [ProducesResponseType(typeof(TenantEmbedSettingsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantEmbedSettingsResponse>> UpdateEmbedSettings(
        [FromBody] UpdateTenantEmbedSettingsRequest? request,
        CancellationToken cancellationToken)
    {
        if (request?.AllowedEmbedOrigins is null)
        {
            return BadRequestProblem("AllowedEmbedOrigins is required.");
        }

        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return Unauthorized();
        }

        var (ok, error) = await tenantOrganizationService.UpdateEmbedSettingsAsync(
            tenantId.Value,
            request.AllowedEmbedOrigins,
            cancellationToken);
        if (!ok)
        {
            return BadRequestProblem(error ?? "Could not update embed settings.");
        }

        var response = await tenantOrganizationService.GetEmbedSettingsAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(response);
    }

    private ActionResult BadRequestProblem(string detail) =>
        Problem(detail: detail, statusCode: StatusCodes.Status400BadRequest, title: "Validation failed");
}
