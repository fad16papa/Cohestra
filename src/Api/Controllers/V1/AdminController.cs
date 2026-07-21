using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Cohestra.Contracts.Admin;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Branding;
using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public class AdminController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    private static readonly HashSet<string> ValidThemePreferences =
        new(StringComparer.OrdinalIgnoreCase) { "light", "dark", "system" };

    [HttpGet("me")]
    [ProducesResponseType(typeof(AdminProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(ToProfile(user, GetRoles()));
    }

    [HttpPatch("me/appearance")]
    [Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
    [ProducesResponseType(typeof(AdminProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminProfileResponse>> UpdateAppearance(
        [FromBody] UpdateAppearanceRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (request.ThemePreference is null || !IsValidThemePreference(request.ThemePreference))
        {
            return BadRequestProblem("Theme preference must be light, dark, or system.");
        }

        var brandValidation = BrandAccentValidator.Validate(request.BrandAccentColor);
        if (brandValidation is not null)
        {
            return BadRequestProblem(brandValidation);
        }

        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        user.ThemePreference = request.ThemePreference.ToLowerInvariant();
        user.BrandAccentColor = BrandAccentValidator.Normalize(
            string.IsNullOrWhiteSpace(request.BrandAccentColor)
                ? null
                : request.BrandAccentColor);
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequestProblem("Could not update appearance preference.");
        }

        return Ok(ToProfile(user, GetRoles()));
    }

    private string[] GetRoles() => TenantProfileRoles.FromPrincipal(User);

    private async Task<ApplicationUser?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userId, out var id))
        {
            return null;
        }

        return await userManager.FindByIdAsync(id.ToString());
    }

    private static AdminProfileResponse ToProfile(ApplicationUser user, string[] roles) =>
        new(
            user.Id.ToString(),
            user.Email ?? string.Empty,
            string.IsNullOrWhiteSpace(user.Nickname) ? null : user.Nickname.Trim(),
            roles,
            NormalizeThemePreference(user.ThemePreference),
            BrandAccentValidator.Normalize(user.BrandAccentColor));

    private static string NormalizeThemePreference(string? value) =>
        value?.ToLowerInvariant() switch
        {
            "light" => "light",
            "dark" => "dark",
            _ => "system",
        };

    private static bool IsValidThemePreference(string? value) =>
        value is not null && ValidThemePreferences.Contains(value);

    private BadRequestObjectResult BadRequestProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return BadRequest(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path
        });
    }
}
