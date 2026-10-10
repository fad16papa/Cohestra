using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Platform-wide searchable audits (FR-44-13). Read-only. DetailsJson is never returned.
/// </summary>
[ApiController]
[Route("api/v1/platform/audits")]
[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]
[Produces("application/json")]
public sealed class PlatformAuditsController(IPlatformAuditSearchService audits) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PlatformAuditListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PlatformAuditListResponse>> Search(
        [FromQuery] string? action,
        [FromQuery] Guid? tenantId,
        [FromQuery] string? actorEmail,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PlatformAuditSearchLimits.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var result = await audits.SearchAsync(
            new PlatformAuditSearchQuery(action, tenantId, actorEmail, from, to, page, pageSize),
            cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequestProblem(result.Error ?? "Invalid audit query.");
        }

        return Ok(result.Value);
    }

    [HttpGet("export")]
    [Produces("text/csv", "application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Export(
        [FromQuery] string? action,
        [FromQuery] Guid? tenantId,
        [FromQuery] string? actorEmail,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var result = await audits.ExportAsync(
            new PlatformAuditSearchQuery(action, tenantId, actorEmail, from, to),
            cancellationToken);
        if (!result.Succeeded || result.Utf8Csv is null || result.FileName is null)
        {
            return BadRequestProblem(result.Error ?? "Invalid audit export.");
        }

        return File(result.Utf8Csv, "text/csv", result.FileName);
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
}
