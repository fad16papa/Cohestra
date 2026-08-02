using Cohestra.Application.Campaigns;
using Cohestra.Contracts.Campaigns;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/branding")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
public sealed class BrandingAssetsController(ICampaignAssetService campaignAssetService) : ControllerBase
{
    [HttpPost("assets")]
    [ProducesResponseType(typeof(CampaignAssetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<ActionResult<CampaignAssetResponse>> UploadAsset(
        IFormFile? file,
        [FromForm] string? altText,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("Image file is required.");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var asset = await campaignAssetService.UploadAsync(
                stream,
                file.FileName,
                file.ContentType,
                altText,
                cancellationToken);

            return Ok(asset);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private ObjectResult BadRequestProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        })
        {
            StatusCode = StatusCodes.Status400BadRequest,
        };
    }
}
