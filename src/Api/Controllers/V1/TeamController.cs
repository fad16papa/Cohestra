using Cohestra.Application.Team;
using Cohestra.Contracts.Team;
using Cohestra.Domain.Tenants;
using Cohestra.Application.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/team")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public sealed class TeamController(
    ITeamInviteService teamInviteService,
    ICurrentTenant currentTenant,
    IOptions<PublicWebOptions> publicWebOptions) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(TeamOverviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TeamOverviewResponse>> Get(CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var overview = await teamInviteService.GetOverviewAsync(tenantId, cancellationToken);
        return Ok(MapOverview(overview));
    }

    [HttpPost("invites")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateInvite(
        [FromBody] CreateTeamInviteRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(Problem("Invalid request", "Email is required."));
        }

        if (!currentTenant.IsResolved
            || currentTenant.TenantId is not Guid tenantId
            || string.IsNullOrWhiteSpace(currentTenant.Slug))
        {
            return Forbid();
        }

        if (!TryParseRole(request.Role, out var role))
        {
            return BadRequest(Problem("Invalid role", "Role must be TenantAdmin or TenantMember."));
        }

        var userId = ResolveUserId();
        if (userId is null)
        {
            return Forbid();
        }

        var acceptBaseUrl = TenantPublicWebUrlBuilder.BuildTenantPath(
            publicWebOptions.Value.BaseUrl,
            currentTenant.Slug,
            "/invite/accept");
        var result = await teamInviteService.CreateInviteAsync(
            tenantId,
            userId.Value,
            request.Email,
            role,
            acceptBaseUrl,
            cancellationToken);

        return MapInviteFailure(result) ?? NoContent();
    }

    [HttpDelete("invites/{inviteId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RevokeInvite(Guid inviteId, CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var result = await teamInviteService.RevokeInviteAsync(tenantId, inviteId, cancellationToken);
        if (result.Error == TeamInviteError.NotFound)
        {
            return NotFound(Problem("Invite not found", result.Detail ?? "Invite not found."));
        }

        return NoContent();
    }

    [HttpDelete("members/{memberUserId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveMember(
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var actorUserId = ResolveUserId();
        if (actorUserId is null)
        {
            return Forbid();
        }

        var result = await teamInviteService.RemoveMemberAsync(
            tenantId,
            actorUserId.Value,
            memberUserId,
            cancellationToken);

        if (result.Succeeded)
        {
            return NoContent();
        }

        return result.Error switch
        {
            TeamInviteError.NotFound => NotFound(Problem("Member not found", result.Detail ?? "Member not found.")),
            TeamInviteError.Conflict => Conflict(
                Problem("Cannot remove member", result.Detail ?? "Cannot remove member.", "member_remove_conflict")),
            TeamInviteError.Validation => BadRequest(
                Problem("Invalid request", result.Detail ?? "Cannot remove member.")),
            _ => BadRequest(Problem("Remove failed", result.Detail ?? "Could not remove member.")),
        };
    }

    private Guid? ResolveUserId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var userId) ? userId : null;
    }

    private static bool TryParseRole(string? value, out TenantMembershipRole role)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            role = TenantMembershipRole.TenantMember;
            return false;
        }

        return Enum.TryParse(value, ignoreCase: true, out role);
    }

    private IActionResult? MapInviteFailure(TeamInviteResult result)
    {
        if (result.Succeeded)
        {
            return null;
        }

        return result.Error switch
        {
            TeamInviteError.PlanLocked => StatusCode(
                StatusCodes.Status403Forbidden,
                Problem("Plan locked", result.Detail ?? "Upgrade required.", "plan_locked")),
            TeamInviteError.SeatCapReached => Conflict(
                Problem("Seat cap reached", result.Detail ?? "No seats available.", "seat_cap_reached")),
            TeamInviteError.Conflict => Conflict(
                Problem("Conflict", result.Detail ?? "Invite conflict.", "invite_conflict")),
            TeamInviteError.Validation => BadRequest(
                Problem("Invalid invite", result.Detail ?? "Validation failed.")),
            _ => BadRequest(Problem("Invite failed", result.Detail ?? "Could not send invite.")),
        };
    }

    private static ProblemDetails Problem(string title, string detail, string? errorCode = null)
    {
        var problem = new ProblemDetails
        {
            Title = title,
            Detail = detail,
            Status = StatusCodes.Status400BadRequest,
        };

        if (!string.IsNullOrWhiteSpace(errorCode))
        {
            problem.Extensions["errorCode"] = errorCode;
        }

        return problem;
    }

    private static TeamOverviewResponse MapOverview(TeamOverviewDto overview) =>
        new(
            overview.Plan,
            overview.SeatLimit,
            overview.ActiveMembers,
            overview.PendingInvites,
            overview.SeatsUsed,
            overview.InvitesAllowed,
            overview.SeatCapReached,
            overview.Members.Select(m => new TeamMemberResponse(
                m.UserId.ToString(),
                m.Email,
                m.Nickname,
                m.Role,
                m.JoinedAt)).ToList(),
            overview.Invites.Select(i => new TeamPendingInviteResponse(
                i.InviteId.ToString(),
                i.Email,
                i.Role,
                i.ExpiresAt,
                i.CreatedAt)).ToList());
}
