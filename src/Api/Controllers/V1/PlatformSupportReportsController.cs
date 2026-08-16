using Cohestra.Application.Support;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/platform/reports/support")]
[Authorize(Policy = TenantAuthPolicies.PlatformAdminOnly)]
public sealed class PlatformSupportReportsController(IPlatformSupportReportService platformSupportReportService)
    : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(PlatformSupportReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PlatformSupportReportResponse>> GetReport(
        [FromQuery] string? preset,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (!TryBuildQuery(preset, from, to, out var query, out var error))
        {
            return BadRequestProblem(error!);
        }

        try
        {
            var report = await platformSupportReportService.GetReportAsync(query, cancellationToken);
            return Ok(report);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("export")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] string? preset,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (!TryBuildQuery(preset, from, to, out var query, out var error))
        {
            return BadRequestProblem(error!);
        }

        try
        {
            var export = await platformSupportReportService.ExportCsvAsync(query, cancellationToken);
            return File(export.Content, "text/csv", export.FileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private static bool TryBuildQuery(
        string? preset,
        DateOnly? from,
        DateOnly? to,
        out PlatformSupportReportQuery query,
        out string? error)
    {
        query = default!;
        error = null;

        if (string.IsNullOrWhiteSpace(preset))
        {
            error = "Preset is required. Use weekly, monthly, or custom.";
            return false;
        }

        var normalizedPreset = preset.Trim().ToLowerInvariant();
        if (normalizedPreset is not ("weekly" or "monthly" or "custom"))
        {
            error = "Preset must be weekly, monthly, or custom.";
            return false;
        }

        query = new PlatformSupportReportQuery(normalizedPreset, from, to);
        return true;
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
