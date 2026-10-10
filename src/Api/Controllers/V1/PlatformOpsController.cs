using System.Security.Claims;
using Cohestra.Application.Platform;
using Cohestra.Application.RateLimiting;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Platform;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/platform")]
[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]
[Produces("application/json")]
public sealed class PlatformOpsController(
    IPlatformTenantOpsService platformTenantOpsService,
    IPlatformOpsOverviewService overviewService,
    IPlatformOpsVersionService versionService,
    IPlatformOpsHealthService healthService,
    IPlatformOpsOutboxService outboxService,
    IPlatformOpsPaddleService paddleService,
    IPlatformRecoveryRateLimiter recoveryRateLimiter,
    IOptions<PlatformRecoveryRateLimitOptions> recoveryRateLimitOptions) : ControllerBase
{
    [HttpGet("ops/health")]
    [ProducesResponseType(typeof(PlatformOpsHealthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformOpsHealthResponse>> GetHealth(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var health = await healthService.GetAsync(cancellationToken);
            return Ok(health);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            Response.ContentType = "application/problem+json";
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Health data unavailable",
                Detail = "Authenticated health checks could not produce a result. Tenant directory remains available.",
                Instance = HttpContext.Request.Path,
            });
        }
    }

    [HttpGet("ops/outbox/summary")]
    [ProducesResponseType(typeof(PlatformOpsOutboxSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformOpsOutboxSummaryResponse>> GetOutboxSummary(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var summary = await outboxService.GetSummaryAsync(cancellationToken);
            return Ok(summary);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            Response.ContentType = "application/problem+json";
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Outbox data unavailable",
                Detail = "Outbox summary could not be loaded. This is not a healthy or failed email status.",
                Instance = HttpContext.Request.Path,
            });
        }
    }

    [HttpGet("ops/outbox")]
    [ProducesResponseType(typeof(PlatformOpsOutboxListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformOpsOutboxListResponse>> ListOutbox(
        [FromQuery] string? status,
        [FromQuery] string? messageType,
        [FromQuery] Guid? tenantId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await outboxService.ListAsync(
                new PlatformOpsOutboxListQuery(status, messageType, tenantId, from, to, page, pageSize),
                cancellationToken);
            if (!result.Succeeded)
            {
                return BadRequestProblem(result.Error ?? "Invalid outbox query.");
            }

            return Ok(result.Value);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            Response.ContentType = "application/problem+json";
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Outbox data unavailable",
                Detail = "Outbox list could not be loaded. This is not a healthy or failed email status.",
                Instance = HttpContext.Request.Path,
            });
        }
    }

    [HttpGet("ops/paddle/config")]
    [ProducesResponseType(typeof(PlatformOpsPaddleConfigResponse), StatusCodes.Status200OK)]
    public ActionResult<PlatformOpsPaddleConfigResponse> GetPaddleConfig()
    {
        return Ok(paddleService.GetConfig());
    }

    [HttpGet("ops/paddle/deliveries")]
    [ProducesResponseType(typeof(PlatformOpsPaddleDeliveryListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformOpsPaddleDeliveryListResponse>> ListPaddleDeliveries(
        [FromQuery] string? disposition,
        [FromQuery] string? eventType,
        [FromQuery] Guid? tenantId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await paddleService.ListDeliveriesAsync(
                new PlatformOpsPaddleDeliveryListQuery(disposition, eventType, tenantId, from, to, page, pageSize),
                cancellationToken);
            if (!result.Succeeded)
            {
                return BadRequestProblem(result.Error ?? "Invalid paddle delivery query.");
            }

            return Ok(result.Value);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            Response.ContentType = "application/problem+json";
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Paddle delivery data unavailable",
                Detail = "Paddle deliveries could not be loaded. This is not a Paddle health status.",
                Instance = HttpContext.Request.Path,
            });
        }
    }

    [HttpGet("ops/overview")]
    [ProducesResponseType(typeof(PlatformOpsOverviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PlatformOpsOverviewResponse>> GetOverview(
        [FromQuery] bool hideLoadTest = true,
        CancellationToken cancellationToken = default)
    {
        var overview = await overviewService.GetAsync(hideLoadTest, cancellationToken);
        return Ok(overview);
    }

    [HttpGet("ops/version")]
    [ProducesResponseType(typeof(PlatformOpsVersionResponse), StatusCodes.Status200OK)]
    public ActionResult<PlatformOpsVersionResponse> GetVersion()
    {
        return Ok(versionService.Get());
    }

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
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformRecoveryActionResponse>> SendPasswordReset(
        Guid tenantId,
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorUserId, out var actorEmail))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        if (!await recoveryRateLimiter.TryConsumeAsync(actorUserId, cancellationToken))
        {
            return RateLimitedProblem();
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
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PlatformRecoveryActionResponse>> ResendEmailVerification(
        Guid tenantId,
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorUserId, out var actorEmail))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        if (!await recoveryRateLimiter.TryConsumeAsync(actorUserId, cancellationToken))
        {
            return RateLimitedProblem();
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

    private ObjectResult RateLimitedProblem()
    {
        Response.ContentType = "application/problem+json";
        var limits = recoveryRateLimitOptions.Value;
        var windowMinutes = Math.Clamp(limits.WindowMinutes, 1, 1440);
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many recovery requests",
            Detail =
                $"You can send up to {limits.MaxActionsPerWindow} recovery emails per {windowMinutes} minutes. Please wait before trying again.",
            Instance = HttpContext.Request.Path,
        };
        problem.Extensions["errorCode"] = RateLimitErrorCodes.PlatformRecoveryRateLimited;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;

        return StatusCode(StatusCodes.Status429TooManyRequests, problem);
    }
}
