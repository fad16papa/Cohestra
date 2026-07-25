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
            preview.ExpiresAt));
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
            return result.Error switch
            {
                TeamInviteError.NotFound => NotFound(new ProblemDetails
                {
                    Title = "Invite not found",
                    Detail = result.Detail,
                    Status = StatusCodes.Status404NotFound,
                }),
                TeamInviteError.Revoked or TeamInviteError.Expired => BadRequest(new ProblemDetails
                {
                    Title = "Invite unavailable",
                    Detail = result.Detail,
                    Status = StatusCodes.Status400BadRequest,
                }),
                TeamInviteError.Conflict or TeamInviteError.SeatCapReached => Conflict(new ProblemDetails
                {
                    Title = "Cannot accept invite",
                    Detail = result.Detail,
                    Status = StatusCodes.Status409Conflict,
                }),
                _ => BadRequest(new ProblemDetails
                {
                    Title = "Invalid invite",
                    Detail = result.Detail ?? "Could not accept invite.",
                    Status = StatusCodes.Status400BadRequest,
                }),
            };
        }

        return Ok(new AcceptTeamInviteResponse(value.Email, value.TenantSlug, value.CreatedAccount));
    }
}
