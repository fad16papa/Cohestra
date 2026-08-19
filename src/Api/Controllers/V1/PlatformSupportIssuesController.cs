using System.Security.Claims;
using Cohestra.Application.Support;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/platform/support-issues")]
[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]
[Produces("application/json")]
public sealed class PlatformSupportIssuesController(IPlatformSupportIssueService platformSupportIssueService)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PlatformSupportIssueListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PlatformSupportIssueListResponse>> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await platformSupportIssueService.ListAsync(
                search,
                status,
                page,
                pageSize,
                cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PlatformSupportIssueDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlatformSupportIssueDetailResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await platformSupportIssueService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFoundProblem("Support issue not found.") : Ok(result);
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(PlatformSupportIssueDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlatformSupportIssueDetailResponse>> Update(
        Guid id,
        [FromBody] UpdatePlatformSupportIssueRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (request.Status is null && request.InternalNote is null)
        {
            return BadRequestProblem("Provide status and/or internalNote to update.");
        }

        if (request.Status is not null && string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequestProblem("Status cannot be empty.");
        }

        try
        {
            var result = await platformSupportIssueService.UpdateAsync(id, request, cancellationToken);
            return result is null ? NotFoundProblem("Support issue not found.") : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("open-count")]
    [ProducesResponseType(typeof(PlatformSupportOpenCountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformSupportOpenCountResponse>> GetOpenCount(
        CancellationToken cancellationToken)
    {
        var count = await platformSupportIssueService.GetOpenCountAsync(cancellationToken);
        return Ok(new PlatformSupportOpenCountResponse(count));
    }

    [HttpPost("{id:guid}/replies")]
    [ProducesResponseType(typeof(PlatformSupportIssueDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlatformSupportIssueDetailResponse>> AddReply(
        Guid id,
        [FromBody] AddPlatformSupportReplyRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (!TryGetActor(out var actorUserId, out var actorEmail))
        {
            return BadRequestProblem("Authenticated user id is missing.");
        }

        try
        {
            var result = await platformSupportIssueService.AddReplyAsync(
                id,
                request,
                actorUserId,
                actorEmail,
                cancellationToken);
            return result is null ? NotFoundProblem("Support issue not found.") : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}/attachments/{attachmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadAttachment(
        Guid id,
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        var result = await platformSupportIssueService.GetAttachmentFileAsync(
            id,
            attachmentId,
            cancellationToken);

        if (result is null)
        {
            return NotFoundProblem("Attachment not found.");
        }

        return File(result.Content, result.ContentType, result.FileName);
    }

    private bool TryGetActor(out Guid actorUserId, out string? actorEmail)
    {
        actorUserId = Guid.Empty;
        actorEmail = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email);
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return Guid.TryParse(raw, out actorUserId) && actorUserId != Guid.Empty;
    }

    private BadRequestObjectResult BadRequestProblem(string detail)
    {
        Response.ContentType = "application/problem+json";
        return BadRequest(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }

    private NotFoundObjectResult NotFoundProblem(string detail)
    {
        Response.ContentType = "application/problem+json";
        return NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Not Found",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }
}
