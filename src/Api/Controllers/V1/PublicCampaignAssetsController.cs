using LeadGenerationCrm.Application.Campaigns;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadGenerationCrm.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/campaign-assets")]
[AllowAnonymous]
public class PublicCampaignAssetsController(ICampaignAssetService campaignAssetService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var file = await campaignAssetService.GetFileAsync(id, cancellationToken);
        if (file is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
