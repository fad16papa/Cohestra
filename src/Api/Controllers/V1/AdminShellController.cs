using Cohestra.Application.Tenants;
using Cohestra.Contracts.Admin;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/shell")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public sealed class AdminShellController(
    ITenantShellService tenantShellService,
    ICurrentTenant currentTenant) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(TenantShellResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TenantShellResponse>> Get(CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var isTenantAdmin = TenantProfileRoles.FromPrincipal(User)
            .Any(r => string.Equals(r, "TenantAdmin", StringComparison.OrdinalIgnoreCase));

        var shell = await tenantShellService.GetShellAsync(tenantId, isTenantAdmin, cancellationToken);
        return Ok(shell);
    }
}
