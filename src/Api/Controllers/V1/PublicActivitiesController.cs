using LeadGenerationCrm.Application.Activities;
using LeadGenerationCrm.Contracts.Activities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadGenerationCrm.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/activities")]
[AllowAnonymous]
[Produces("application/json")]
public class PublicActivitiesController(IActivityService activityService) : ControllerBase
{
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(PublicActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicActivityResponse>> GetBySlug(
        string slug,
        CancellationToken cancellationToken)
    {
        var activity = await activityService.GetPublicBySlugAsync(slug, cancellationToken);
        return activity is null ? NotFound() : Ok(activity);
    }
}
