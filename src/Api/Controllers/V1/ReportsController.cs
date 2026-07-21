using Cohestra.Application.Reports;
using Cohestra.Contracts.Reports;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/reports")]
[Authorize(Roles = OperatorSeeder.TenantAdminRole)]
public class ReportsController(IReportService reportService) : ControllerBase
{
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(ReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReportResponse>> GetReport(
        [FromQuery] string? preset,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] Guid? activityId,
        [FromQuery] string? community,
        [FromQuery] string? leadStatus,
        [FromQuery] string? referralSource,
        CancellationToken cancellationToken)
    {
        if (!TryBuildReportQuery(
                preset,
                from,
                to,
                activityId,
                community,
                leadStatus,
                referralSource,
                out var query,
                out var error))
        {
            return BadRequestProblem(error!);
        }

        try
        {
            var report = await reportService.GetReportAsync(query, cancellationToken);
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
    public async Task<IActionResult> ExportReportCsv(
        [FromQuery] string? preset,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] Guid? activityId,
        [FromQuery] string? community,
        [FromQuery] string? leadStatus,
        [FromQuery] string? referralSource,
        CancellationToken cancellationToken)
    {
        if (!TryBuildReportQuery(
                preset,
                from,
                to,
                activityId,
                community,
                leadStatus,
                referralSource,
                out var query,
                out var error))
        {
            return BadRequestProblem(error!);
        }

        try
        {
            var export = await reportService.ExportReportCsvAsync(query, cancellationToken);
            Response.Headers.Append("X-Registration-Row-Count", export.RegistrationRowCount.ToString());
            return File(export.Content, "text/csv", export.FileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private static bool TryBuildReportQuery(
        string? preset,
        DateOnly? from,
        DateOnly? to,
        Guid? activityId,
        string? community,
        string? leadStatus,
        string? referralSource,
        out ReportQuery query,
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

        if (!string.IsNullOrWhiteSpace(leadStatus))
        {
            var normalizedStatus = leadStatus.Trim().ToLowerInvariant();
            if (normalizedStatus is not ("new" or "contacted" or "active" or "inactive"))
            {
                error = "leadStatus must be new, contacted, active, or inactive.";
                return false;
            }
        }

        query = new ReportQuery(
            normalizedPreset,
            from,
            to,
            activityId,
            community,
            leadStatus,
            referralSource);

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
