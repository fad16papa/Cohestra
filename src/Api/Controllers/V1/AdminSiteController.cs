using System.Security.Claims;
using Cohestra.Application.Site;
using Cohestra.Contracts.Site;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/site")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class AdminSiteController(ISitePageService sitePageService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SitePageAdminResponse>> Get(CancellationToken cancellationToken)
    {
        var response = await sitePageService.GetAdminAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPut]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> UpdateDraft(
        [FromBody] UpdateSiteDraftRequest? request,
        CancellationToken cancellationToken)
    {
        if (request?.Draft is null)
        {
            return BadRequestProblem("Draft payload is required.");
        }

        try
        {
            var response = await sitePageService.UpdateDraftAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("publish")]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> Publish(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var response = await sitePageService.PublishAsync(userId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("preview-token")]
    [ProducesResponseType(typeof(SitePreviewTokenResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SitePreviewTokenResponse>> CreatePreviewToken(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var response = await sitePageService.CreatePreviewTokenAsync(userId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("apply-preset")]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> ApplyPreset(
        [FromBody] ApplySitePresetRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.PresetId))
        {
            return BadRequestProblem("PresetId is required.");
        }

        try
        {
            var response = await sitePageService.ApplyPresetAsync(request.PresetId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("revert-published")]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> RevertPublished(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var response = await sitePageService.RevertPublishedAsync(userId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("templates")]
    [ProducesResponseType(typeof(SiteHomepageTemplateSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SiteHomepageTemplateSummaryDto>> CreateTemplate(
        [FromBody] CreateSiteHomepageTemplateRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Template name is required.");
        }

        try
        {
            var response = await sitePageService.CreateSavedTemplateAsync(request.Name, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("templates/{templateId:guid}/apply")]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> ApplyTemplate(
        Guid templateId,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await sitePageService.ApplySavedTemplateAsync(templateId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("templates/{templateId:guid}")]
    [ProducesResponseType(typeof(SitePageAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SitePageAdminResponse>> DeleteTemplate(
        Guid templateId,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await sitePageService.DeleteSavedTemplateAsync(templateId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("sub");

        return Guid.TryParse(userIdValue, out userId);
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
