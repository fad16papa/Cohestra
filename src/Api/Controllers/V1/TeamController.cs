using Cohestra.Contracts.Team;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Epic 14 will replace this stub with invite/seat management.
/// Policy name <see cref="TenantAuthPolicies.TenantAdminOnly"/> must be preserved.
/// </summary>
[ApiController]
[Route("api/v1/admin/team")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public class TeamController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(TeamStubResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<TeamStubResponse> List() =>
        Ok(new TeamStubResponse([]));
}
