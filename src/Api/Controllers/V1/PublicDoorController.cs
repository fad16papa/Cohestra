using Cohestra.Application.PublicDoor;
using Cohestra.Contracts.PublicDoor;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/door")]
[AllowAnonymous]
[Produces("application/json")]
public sealed class PublicDoorController(IPublicDoorService publicDoorService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PublicDoorResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicDoorResponse>> Get(CancellationToken cancellationToken)
    {
        var response = await publicDoorService.GetAsync(
            TenantRequestHost.GetEffectiveHost(HttpContext),
            cancellationToken);
        Response.Headers.CacheControl = response.Kind switch
        {
            "active" => "public, max-age=60",
            "marketing" => "public, max-age=300",
            _ => "no-store",
        };

        return Ok(response);
    }
}
