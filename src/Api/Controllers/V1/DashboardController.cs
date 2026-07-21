using Cohestra.Application.Dashboard;
using Cohestra.Contracts.Dashboard;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/dashboard")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
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
