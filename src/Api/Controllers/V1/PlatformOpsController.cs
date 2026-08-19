using System.Security.Claims;
using Cohestra.Application.Platform;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/platform")]
[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]
[Produces("application/json")]
public sealed class PlatformOpsController(IPlatformTenantOpsService platformTenantOpsService) : ControllerBase
{
    [HttpGet("search")]
    [ProducesResponseType(typeof(PlatformOmniSearchResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformOmniSearchResponse>> Search(
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var result = await platformTenantOpsService.SearchAsync(q, cancellationToken);
        return Ok(result);
    }

    [HttpGet("tenants/{tenantId:guid}/snapshot")]
    [ProducesResponseType(typeof(PlatformTenantSnapshotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlatformTenantSnapshotResponse>> GetSnapshot(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await platformTenantOpsService.GetSnapshotAsync(tenantId, cancellationToken);
        return ToActionResult(result);
    }

    [HttpGet("tenants/{tenantId:guid}/members")]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformTenantMemberResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PlatformTenantMemberResponse>>> ListMembers(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await platformTenantOpsService.ListMembersAsync(tenantId, cancellationToken);
        return ToMembersActionResult(result);
    }

    [HttpGet("tenants/{tenantId:guid}/open-issues")]
    [ProducesResponseType(typeof(IReadOnlyList<PlatformTenantOpenIssueResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PlatformTenantOpenIssueResponse>>> ListOpenIssues(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await platformTenantOpsService.ListOpenIssuesAsync(tenantId, cancellationToken);
        return ToOpenIssuesActionResult(result);
    }

    [HttpPost("tenants/{tenantId:guid}/members/{memberUserId:guid}/send-password-reset")]
    [ProducesResponseType(typeof(PlatformRecoveryActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlatformRecoveryActionResponse>> SendPasswordReset(
        Guid tenantId,
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorUserId, out var actorEmail))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantOpsService.SendPasswordResetAsync(
            tenantId,
            memberUserId,
            actorUserId,
            actorEmail,
            cancellationToken);
        return ToRecoveryActionResult(result);
    }

    [HttpPost("tenants/{tenantId:guid}/members/{memberUserId:guid}/resend-email-verification")]
    [ProducesResponseType(typeof(PlatformRecoveryActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PlatformRecoveryActionResponse>> ResendEmailVerification(
        Guid tenantId,
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorUserId, out var actorEmail))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantOpsService.ResendEmailVerificationAsync(
            tenantId,
            memberUserId,
            actorUserId,
            actorEmail,
            cancellationToken);
        return ToRecoveryActionResult(result);
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

    private ActionResult<PlatformTenantSnapshotResponse> ToActionResult(
        PlatformTenantResult<PlatformTenantSnapshotResponse> result)
    {
        if (result.Succeeded && result.Value is not null)
        {
            return Ok(result.Value);
        }

        return result.Error switch
        {
            PlatformTenantError.NotFound => NotFoundProblem(result.Detail ?? "Tenant not found."),
            _ => BadRequestProblem(result.Detail ?? "Request failed."),
        };
    }

    private ActionResult<IReadOnlyList<PlatformTenantMemberResponse>> ToMembersActionResult(
        PlatformTenantResult<IReadOnlyList<PlatformTenantMemberResponse>> result)
    {
        if (result.Succeeded && result.Value is not null)
        {
            return Ok(result.Value);
        }

        return result.Error switch
        {
            PlatformTenantError.NotFound => NotFoundProblem(result.Detail ?? "Tenant not found."),
            _ => BadRequestProblem(result.Detail ?? "Request failed."),
        };
    }

    private ActionResult<IReadOnlyList<PlatformTenantOpenIssueResponse>> ToOpenIssuesActionResult(
        PlatformTenantResult<IReadOnlyList<PlatformTenantOpenIssueResponse>> result)
    {
        if (result.Succeeded && result.Value is not null)
        {
            return Ok(result.Value);
        }

        return result.Error switch
        {
            PlatformTenantError.NotFound => NotFoundProblem(result.Detail ?? "Tenant not found."),
            _ => BadRequestProblem(result.Detail ?? "Request failed."),
        };
    }

    private ActionResult<PlatformRecoveryActionResponse> ToRecoveryActionResult(
        PlatformTenantResult<PlatformRecoveryActionResponse> result)
    {
        if (result.Succeeded && result.Value is not null)
        {
            return Ok(result.Value);
        }

        return result.Error switch
        {
            PlatformTenantError.NotFound => NotFoundProblem(result.Detail ?? "Not found."),
            PlatformTenantError.Conflict => ConflictProblem(result.Detail ?? "Conflict."),
            _ => BadRequestProblem(result.Detail ?? "Request failed."),
        };
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

    private ObjectResult ConflictProblem(string detail)
    {
        Response.ContentType = "application/problem+json";
        return Conflict(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }

    private UnauthorizedObjectResult UnauthorizedProblem(string detail)
    {
        Response.ContentType = "application/problem+json";
        return Unauthorized(new ProblemDetails
        {
            Status = StatusCodes.Status401Unauthorized,
            Title = "Unauthorized",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }
}
