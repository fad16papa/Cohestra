using System.Security.Claims;
using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Platform Admin session profile. Tenant Admin GET /api/v1/admin/me is role-gated to TenantAdmin
/// and cannot be used by PlatformAdmin-only users (Story 11.4).
/// </summary>
[ApiController]
[Route("api/v1/platform")]
[Authorize(Roles = PlatformAdminSeeder.PlatformAdminRole)]
[Produces("application/json")]
public sealed class PlatformMeController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(PlatformProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PlatformProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id) || id == Guid.Empty)
        {
            return Unauthorized();
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return Unauthorized();
        }

        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        return Ok(new PlatformProfileResponse(
            user.Id.ToString(),
            user.Email ?? string.Empty,
            roles));
    }
}
