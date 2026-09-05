using Cohestra.Application.Intelligence;
using Cohestra.Contracts.Intelligence;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/intelligence")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public class IntelligenceController(IIntelligenceBriefService briefService) : ControllerBase
{
    /// <summary>Tenant-scoped deterministic operator brief: what needs attention, why, and the next action.</summary>
    [HttpGet("brief")]
    [ProducesResponseType(typeof(IntelligenceBriefResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<IntelligenceBriefResponse>> GetBrief(
        CancellationToken cancellationToken)
    {
        var brief = await briefService.GetBriefAsync(cancellationToken);
        return Ok(brief);
    }
}
