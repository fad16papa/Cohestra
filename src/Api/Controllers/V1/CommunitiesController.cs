using Cohestra.Application.Activities;
using Cohestra.Application.Clients;
using Cohestra.Contracts.Activities;
using Cohestra.Contracts.Clients;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/communities")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class CommunitiesController(
    ICommunityService communityService,
    IClientService clientService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(CommunityListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CommunityListResponse>> List(CancellationToken cancellationToken)
    {
        var result = await communityService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CommunityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var community = await communityService.GetByIdAsync(id, cancellationToken);
        return community is null ? NotFound() : Ok(community);
    }

    [HttpGet("{id:guid}/clients")]
    [ProducesResponseType(typeof(ClientListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClientListResponse>> ListClients(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] string? leadStatus = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var community = await communityService.GetByIdAsync(id, cancellationToken);
        if (community is null)
        {
            return NotFound();
        }

        try
        {
            var result = await clientService.ListAsync(
                page,
                pageSize,
                sortBy,
                sortDirection,
                mergeSuspect: null,
                createdWithinDays: null,
                registeredWithinDays: null,
                leadStatus,
                nationality: null,
                search,
                community: community.Name,
                consentOnly: null,
                excludeCommunity: null,
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommunityResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CommunityResponse>> Create(
        [FromBody] CreateCommunityRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Community name is required.");
        }

        try
        {
            var community = await communityService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = community.Id }, community);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(CommunityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommunityResponse>> Update(
        Guid id,
        [FromBody] UpdateCommunityRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Community name is required.");
        }

        try
        {
            var community = await communityService.UpdateAsync(id, request, cancellationToken);
            return community is null ? NotFound() : Ok(community);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await communityService.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
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
