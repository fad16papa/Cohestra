using Cohestra.Application.Site;
using Cohestra.Contracts.Site;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/site")]
[AllowAnonymous]
[Produces("application/json")]
public class PublicSiteController(ISitePageService sitePageService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PublicSiteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicSiteResponse>> Get(CancellationToken cancellationToken)
    {
        var response = await sitePageService.GetPublicAsync(cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public, max-age=60";
        return Ok(response);
    }

    [HttpGet("preview")]
    [ProducesResponseType(typeof(PublicSiteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicSiteResponse>> GetPreview(
        [FromQuery] string? token,
        CancellationToken cancellationToken)
    {
        var response = await sitePageService.GetPreviewAsync(token ?? string.Empty, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-store";
        return Ok(response);
    }
}
