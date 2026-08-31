using Cohestra.Application.Tenants;
using Cohestra.Contracts.PublicEmbed;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/embed-origins")]
[AllowAnonymous]
[Produces("application/json")]
public sealed class PublicEmbedOriginsController(
    ICurrentTenant currentTenant,
    ITenantOrganizationService tenantOrganizationService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PublicEmbedOriginsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicEmbedOriginsResponse>> Get(CancellationToken cancellationToken)
    {
        var tenantId = currentTenant.TenantId;
        if (tenantId is null)
        {
            return NotFound();
        }

        var settings = await tenantOrganizationService.GetEmbedSettingsAsync(
            tenantId.Value,
            cancellationToken);
        return Ok(new PublicEmbedOriginsResponse(settings.AllowedEmbedOrigins));
    }
}
