using System.Security.Claims;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Platform Admin tenant lifecycle (FR-2). Suspend is break-glass (abuse/ToS/support freeze), not collections.
/// </summary>
[ApiController]
[Route("api/v1/platform/tenants")]
[Authorize(Roles = PlatformAdminSeeder.PlatformAdminRole)]
[Produces("application/json")]
public sealed class PlatformTenantsController(IPlatformTenantService platformTenantService) : ControllerBase
{
    /// <summary>Provision a tenant workspace (Status=Active). Does not create tenant memberships.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TenantResponse>> Create(
        [FromBody] CreateTenantRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (!TryGetActorUserId(out var actorUserId))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantService.CreateAsync(request, actorUserId, cancellationToken);
        return ToActionResult(result, created: true);
    }

    /// <summary>
    /// Break-glass suspend (abuse / ToS / support freeze). Does not change BillingStatus. Not for non-payment.
    /// </summary>
    [HttpPost("{tenantId:guid}/suspend")]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TenantResponse>> Suspend(
        Guid tenantId,
        [FromBody] SuspendTenantRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (!TryGetActorUserId(out var actorUserId))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantService.SuspendAsync(tenantId, request, actorUserId, cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>Reactivate a Suspended tenant. BillingStatus is left unchanged.</summary>
    [HttpPost("{tenantId:guid}/reactivate")]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TenantResponse>> Reactivate(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorUserId(out var actorUserId))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantService.ReactivateAsync(tenantId, actorUserId, cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>Soft-archive a tenant (Status=Archived, ArchivedAt set). 30-day retention before purge (purge job out of scope).</summary>
    [HttpPost("{tenantId:guid}/archive")]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TenantResponse>> Archive(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorUserId(out var actorUserId))
        {
            return UnauthorizedProblem("Authenticated user id is missing.");
        }

        var result = await platformTenantService.ArchiveAsync(tenantId, actorUserId, cancellationToken);
        return ToActionResult(result);
    }

    private ActionResult<TenantResponse> ToActionResult(
        PlatformTenantResult<TenantResponse> result,
        bool created = false)
    {
        if (result.Succeeded && result.Value is not null)
        {
            return created
                ? Created($"/api/v1/platform/tenants/{result.Value.Id}", result.Value)
                : Ok(result.Value);
        }

        return result.Error switch
        {
            PlatformTenantError.Validation => BadRequestProblem(result.Detail ?? "Invalid request."),
            PlatformTenantError.NotFound => NotFoundProblem(result.Detail ?? "Tenant not found."),
            PlatformTenantError.Conflict => ConflictProblem(result.Detail ?? "Conflict."),
            _ => BadRequestProblem(result.Detail ?? "Request failed."),
        };
    }

    private bool TryGetActorUserId(out Guid actorUserId)
    {
        actorUserId = Guid.Empty;
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
