using Cohestra.Application.Campaigns;
using Cohestra.Contracts.Campaigns;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/email-templates")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class EmailTemplatesController(IEmailTemplateService emailTemplateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(EmailTemplateListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmailTemplateListResponse>> List(
        CancellationToken cancellationToken)
    {
        var result = await emailTemplateService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EmailTemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmailTemplateResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var template = await emailTemplateService.GetByIdAsync(id, cancellationToken);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpPost]
    [ProducesResponseType(typeof(EmailTemplateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EmailTemplateResponse>> Create(
        [FromBody] CreateEmailTemplateRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateTemplateRequest(request);
        if (validationError is not null)
        {
            return BadRequestProblem(validationError);
        }

        var template = await emailTemplateService.CreateAsync(request!, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(EmailTemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmailTemplateResponse>> Update(
        Guid id,
        [FromBody] UpdateEmailTemplateRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateTemplateRequest(request);
        if (validationError is not null)
        {
            return BadRequestProblem(validationError);
        }

        var template = await emailTemplateService.UpdateAsync(id, request!, cancellationToken);
        return template is null ? NotFound() : Ok(template);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await emailTemplateService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private static string? ValidateTemplateRequest(CreateEmailTemplateRequest? request)
    {
        if (request is null)
        {
            return "Request body is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Template name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return "Template subject is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Body))
        {
            return "Template body is required.";
        }

        return null;
    }

    private static string? ValidateTemplateRequest(UpdateEmailTemplateRequest? request) =>
        request is null
            ? "Request body is required."
            : ValidateTemplateRequest(new CreateEmailTemplateRequest(
                request.Name,
                request.Subject,
                request.Body));

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
