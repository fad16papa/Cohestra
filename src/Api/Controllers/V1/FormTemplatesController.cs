using Cohestra.Application.Activities;
using Cohestra.Contracts.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/form-templates")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public class FormTemplatesController(IFormTemplateService formTemplateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(FormTemplateListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FormTemplateListResponse>> List(
        CancellationToken cancellationToken)
    {
        var result = await formTemplateService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FormTemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormTemplateResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var template = await formTemplateService.GetByIdAsync(id, cancellationToken);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpPost]
    [ProducesResponseType(typeof(FormTemplateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FormTemplateResponse>> Create(
        [FromBody] CreateFormTemplateRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        try
        {
            var template = await formTemplateService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
        catch (FormSchemaPlanLockedException ex)
        {
            return PlanLockedProblem(ex.Message);
        }
        catch (FormTemplatePlanLockedException ex)
        {
            return PlanLockedProblem(ex.Message);
        }
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(FormTemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormTemplateResponse>> Update(
        Guid id,
        [FromBody] UpdateFormTemplateRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        if (request.Name is null && request.FormSchema is null)
        {
            return BadRequestProblem("At least one of name or formSchema is required.");
        }

        try
        {
            var template = await formTemplateService.UpdateAsync(id, request, cancellationToken);
            return template is null ? NotFound() : Ok(template);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
        catch (FormSchemaPlanLockedException ex)
        {
            return PlanLockedProblem(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await formTemplateService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
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

    private ObjectResult PlanLockedProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Forbidden",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        };
        problem.Extensions["errorCode"] = "plan_locked";

        return new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}
