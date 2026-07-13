using Cohestra.Application.Activities;
using Cohestra.Contracts.Activities;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/activities")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class ActivitiesController(IActivityService activityService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ActivityListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActivityListResponse>> List(
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] string? community,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(status) &&
            !Enum.TryParse<Domain.Activities.ActivityStatus>(status, ignoreCase: true, out _))
        {
            return BadRequestProblem("Status must be draft, published, or archived.");
        }

        var result = await activityService.ListAsync(
            status,
            category,
            community,
            search,
            page,
            pageSize,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var activity = await activityService.GetByIdAsync(id, cancellationToken);
        return activity is null ? NotFound() : Ok(activity);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ActivityResponse>> Create(
        [FromBody] CreateActivityRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateCreateRequest(request);
        if (validationError is not null)
        {
            return BadRequestProblem(validationError);
        }

        if (!string.IsNullOrWhiteSpace(request!.Status) &&
            !Enum.TryParse<Domain.Activities.ActivityStatus>(request.Status, ignoreCase: true, out _))
        {
            return BadRequestProblem("Status must be draft, published, or archived.");
        }

        try
        {
            var activity = await activityService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> Update(
        Guid id,
        [FromBody] UpdateActivityRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateUpdateRequest(request);
        if (validationError is not null)
        {
            return BadRequestProblem(validationError);
        }

        try
        {
            var activity = await activityService.UpdateAsync(id, request!, cancellationToken);
            return activity is null ? NotFound() : Ok(activity);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPatch("{id:guid}/show-on-homepage")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> UpdateShowOnHomepage(
        Guid id,
        [FromBody] UpdateActivityShowOnHomepageRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("ShowOnHomepage payload is required.");
        }

        try
        {
            var activity = await activityService.UpdateShowOnHomepageAsync(
                id,
                request.ShowOnHomepage,
                cancellationToken);

            return activity is null ? NotFound() : Ok(activity);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}/registrations")]
    [ProducesResponseType(typeof(ActivityRegistrationListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityRegistrationListResponse>> ListRegistrations(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await activityService.ListRegistrationsAsync(
            id,
            page,
            pageSize,
            cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/registration-link")]
    [ProducesResponseType(typeof(ActivityRegistrationLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityRegistrationLinkResponse>> GetRegistrationLink(
        Guid id,
        CancellationToken cancellationToken)
    {
        var link = await activityService.GetRegistrationLinkAsync(id, cancellationToken);
        return link is null ? NotFound() : Ok(link);
    }

    [HttpGet("{id:guid}/qr-code.png")]
    [Produces("image/png")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQrCode(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var png = await activityService.GetQrCodePngAsync(id, cancellationToken);
            if (png is null)
            {
                return NotFound();
            }

            return File(png, "image/png", $"activity-{id}-qr.png");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/publish")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> Publish(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var activity = await activityService.PublishAsync(id, cancellationToken);
            return activity is null ? NotFound() : Ok(activity);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/unpublish")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> Unpublish(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var activity = await activityService.UnpublishAsync(id, cancellationToken);
            return activity is null ? NotFound() : Ok(activity);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/archive")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> Archive(
        Guid id,
        CancellationToken cancellationToken)
    {
        var activity = await activityService.ArchiveAsync(id, cancellationToken);
        return activity is null ? NotFound() : Ok(activity);
    }

    /// <summary>
    /// Saves the activity registration form schema (JSONB). Contract: docs/contracts/activity-form-schema-v1.md
    /// </summary>
    [HttpPut("{id:guid}/form-schema")]
    [ProducesResponseType(typeof(ActivityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityResponse>> SaveFormSchema(
        Guid id,
        [FromBody] SaveActivityFormSchemaRequest? request,
        CancellationToken cancellationToken)
    {
        if (request?.FormSchema is null)
        {
            return BadRequestProblem("Form schema is required.");
        }

        try
        {
            var activity = await activityService.UpdateFormSchemaAsync(
                id,
                request.FormSchema,
                cancellationToken);
            return activity is null ? NotFound() : Ok(activity);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private static string? ValidateCreateRequest(CreateActivityRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return "Activity name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Category) ||
            string.IsNullOrWhiteSpace(request.Schedule) ||
            string.IsNullOrWhiteSpace(request.Location) ||
            string.IsNullOrWhiteSpace(request.CommunityLabel))
        {
            return "Category, schedule, location, and community label are required.";
        }

        return null;
    }

    private static string? ValidateUpdateRequest(UpdateActivityRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return "Activity name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Category) ||
            string.IsNullOrWhiteSpace(request.Schedule) ||
            string.IsNullOrWhiteSpace(request.Location) ||
            string.IsNullOrWhiteSpace(request.CommunityLabel))
        {
            return "Category, schedule, location, and community label are required.";
        }

        return null;
    }

    private ObjectResult BadRequestProblem(string detail) =>
        ProblemResult(StatusCodes.Status400BadRequest, "Bad Request", detail);

    private ObjectResult ConflictProblem(string detail) =>
        ProblemResult(StatusCodes.Status409Conflict, "Conflict", detail);

    private ObjectResult ProblemResult(int statusCode, string title, string detail)
    {
        Response.ContentType = "application/problem+json";

        return new ObjectResult(new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        })
        {
            StatusCode = statusCode,
        };
    }
}
