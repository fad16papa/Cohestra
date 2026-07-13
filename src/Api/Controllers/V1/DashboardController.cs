using LeadGenerationCrm.Application.Dashboard;
using LeadGenerationCrm.Contracts.Dashboard;
using LeadGenerationCrm.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadGenerationCrm.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/dashboard")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(DashboardMetricsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardMetricsResponse>> GetMetrics(
        CancellationToken cancellationToken)
    {
        var metrics = await dashboardService.GetMetricsAsync(cancellationToken);
        return Ok(metrics);
    }
}
