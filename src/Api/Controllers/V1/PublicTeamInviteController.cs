using Cohestra.Application.Team;
using Cohestra.Contracts.Team;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/team/invites")]
public sealed class PublicTeamInviteController(ITeamInviteService teamInviteService) : ControllerBase
{
    [HttpGet("preview")]
    [ProducesResponseType(typeof(InvitePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Preview([FromQuery] string? token, CancellationToken cancellationToken)
    {
        var preview = await teamInviteService.GetInvitePreviewAsync(token ?? string.Empty, cancellationToken);
        if (preview is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Invite not found",
                Detail = "This invite is invalid, expired, or revoked.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        return Ok(new InvitePreviewResponse(
            preview.TenantName,
            preview.TenantSlug,
            preview.Email,
            preview.Role,
            preview.ExpiresAt,
            preview.RequiresActivationOtp));
    }

    [HttpPost("activation")]
    [ProducesResponseType(typeof(StartInviteActivationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> StartActivation(
        [FromBody] StartInviteActivationRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(Problem("Invalid request", "Token is required.", StatusCodes.Status400BadRequest));
        }

        var (result, value) = await teamInviteService.StartInviteActivationAsync(
            new StartInviteActivationCommand(request.Token, request.Nickname),
            cancellationToken);
        if (!result.Succeeded || value is null)
        {
            return InviteFailure(result);
        }

        return Ok(new StartInviteActivationResponse(value.CodeSent, value.MaskedEmail, value.ExpiresInSeconds));
    }

    [HttpPost("activation/verify")]
    [ProducesResponseType(typeof(AcceptTeamInviteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> VerifyActivation(
        [FromBody] CompleteInviteActivationRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(Problem("Invalid request", "Token and email code are required.", StatusCodes.Status400BadRequest));
        }

        var (result, value) = await teamInviteService.CompleteInviteActivationAsync(
            new CompleteInviteActivationCommand(request.Token, request.Password, request.Nickname, request.Code),
            cancellationToken);
        if (!result.Succeeded || value is null)
        {
            return InviteFailure(result);
        }

        return Ok(new AcceptTeamInviteResponse(value.Email, value.TenantSlug, value.CreatedAccount));
    }

    [HttpPost("accept")]
    [ProducesResponseType(typeof(AcceptTeamInviteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Accept(
        [FromBody] AcceptTeamInviteRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = "Token is required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var (result, value) = await teamInviteService.AcceptInviteAsync(
            new AcceptInviteCommand(request.Token, request.Password, request.Nickname),
            cancellationToken);

        if (!result.Succeeded || value is null)
        {
            return InviteFailure(result);
        }

        return Ok(new AcceptTeamInviteResponse(value.Email, value.TenantSlug, value.CreatedAccount));
    }

    private IActionResult InviteFailure(TeamInviteResult result)
    {
        var problem = result.Error switch
        {
            TeamInviteError.NotFound => Problem("Invite not found", result.Detail, StatusCodes.Status404NotFound),
            TeamInviteError.Revoked or TeamInviteError.Expired => Problem(
                "Invite unavailable",
                result.Detail,
                StatusCodes.Status400BadRequest),
            TeamInviteError.Conflict or TeamInviteError.SeatCapReached => Problem(
                "Cannot accept invite",
                result.Detail,
                StatusCodes.Status409Conflict),
            TeamInviteError.RateLimited => Problem(
                "Too many attempts",
                result.Detail,
                StatusCodes.Status429TooManyRequests),
            TeamInviteError.ActivationOtpRequired => Problem(
                "Email code required",
                result.Detail,
                StatusCodes.Status400BadRequest,
                "activation_otp_required"),
            _ => Problem(
                "Invalid invite",
                result.Detail ?? "Could not accept invite.",
                StatusCodes.Status400BadRequest),
        };
        return new ObjectResult(problem) { StatusCode = problem.Status };
    }

    private static ProblemDetails Problem(string title, string? detail, int status, string? errorCode = null)
    {
        var problem = new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = status,
        };
        if (!string.IsNullOrWhiteSpace(errorCode))
        {
            problem.Extensions["errorCode"] = errorCode;
        }

        return problem;
    }
}
