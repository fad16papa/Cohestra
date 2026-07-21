using Cohestra.Application.Campaigns;
using Cohestra.Contracts.Campaigns;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/campaigns")]
[Authorize(Roles = OperatorSeeder.TenantAdminRole)]
public class CampaignsController(
    ICampaignService campaignService,
    IClientSegmentService segmentService,
    ICampaignAssetService campaignAssetService,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(CampaignListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CampaignListResponse>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await campaignService.ListAsync(page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CampaignDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CampaignDetailResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var campaign = await campaignService.GetByIdAsync(id, cancellationToken);
        return campaign is null ? NotFound() : Ok(campaign);
    }

    [HttpPost("segment/preview")]
    [ProducesResponseType(typeof(ClientSegmentPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClientSegmentPreviewResponse>> PreviewSegment(
        [FromBody] ClientSegmentQueryRequest? query,
        CancellationToken cancellationToken)
    {
        if (query is null)
        {
            return BadRequestProblem("Segment query is required.");
        }

        try
        {
            var preview = await segmentService.PreviewAsync(query, cancellationToken);
            return Ok(preview);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

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

    [HttpPost("assets/from-activity-qr")]
    [ProducesResponseType(typeof(CampaignAssetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CampaignAssetResponse>> CreateAssetFromActivityQr(
        [FromBody] CreateCampaignAssetFromQrRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        try
        {
            var asset = await campaignAssetService.CreateFromActivityQrAsync(
                request.ActivityId,
                request.AltText,
                cancellationToken);

            return Ok(asset);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("send-test")]
    [ProducesResponseType(typeof(SendTestCampaignEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SendTestCampaignEmailResponse>> SendTest(
        [FromBody] SendTestCampaignEmailRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var operatorEmail = await GetCurrentUserEmailAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(operatorEmail))
        {
            return BadRequestProblem("Could not resolve operator email for test send.");
        }

        try
        {
            var result = await campaignService.SendTestAsync(request, operatorEmail, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("send")]
    [ProducesResponseType(typeof(SendCampaignResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SendCampaignResponse>> Send(
        [FromBody] SendCampaignRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Campaign request is required.");
        }

        if (request.Segment is null)
        {
            return BadRequestProblem("Campaign segment is required.");
        }

        try
        {
            var result = await campaignService.SendAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private async Task<string?> GetCurrentUserEmailAsync(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userId, out var id))
        {
            return null;
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        return user?.Email;
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
