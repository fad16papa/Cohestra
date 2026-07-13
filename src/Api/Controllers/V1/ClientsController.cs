using LeadGenerationCrm.Application.Clients;
using LeadGenerationCrm.Contracts.Clients;
using LeadGenerationCrm.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadGenerationCrm.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/clients")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class ClientsController(IClientService clientService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ClientListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClientListResponse>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] bool? mergeSuspect = null,
        [FromQuery] int? createdWithinDays = null,
        [FromQuery] int? registeredWithinDays = null,
        [FromQuery] string? leadStatus = null,
        [FromQuery] string? nationality = null,
        [FromQuery] string? search = null,
        [FromQuery] string? community = null,
        [FromQuery] bool? consentOnly = null,
        [FromQuery] string? excludeCommunity = null,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateListQuery(
            sortBy,
            sortDirection,
            createdWithinDays,
            registeredWithinDays,
            leadStatus);
        if (validationError is not null)
        {
            return BadRequestProblem(validationError);
        }

        try
        {
            var result = await clientService.ListAsync(
                page,
                pageSize,
                sortBy,
                sortDirection,
                mergeSuspect,
                createdWithinDays,
                registeredWithinDays,
                leadStatus,
                nationality,
                search,
                community,
                consentOnly,
                excludeCommunity,
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("nationalities")]
    [ProducesResponseType(typeof(IReadOnlyList<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<string>>> ListNationalities(
        CancellationToken cancellationToken)
    {
        var nationalities = await clientService.ListNationalitiesAsync(cancellationToken);
        return Ok(nationalities);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ClientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDetailResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var client = await clientService.GetByIdAsync(id, cancellationToken);
        return client is null ? NotFound() : Ok(client);
    }

    [HttpPatch("{id:guid}/lead-status")]
    [ProducesResponseType(typeof(ClientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDetailResponse>> UpdateLeadStatus(
        Guid id,
        [FromBody] UpdateClientLeadStatusRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.LeadStatus))
        {
            return BadRequestProblem("Lead status is required.");
        }

        try
        {
            var client = await clientService.UpdateLeadStatusAsync(
                id,
                request.LeadStatus,
                cancellationToken);

            return client is null ? NotFound() : Ok(client);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPatch("{id:guid}/master-profile")]
    [ProducesResponseType(typeof(ClientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDetailResponse>> UpdateMasterProfile(
        Guid id,
        [FromBody] UpdateClientMasterProfileRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Master profile payload is required.");
        }

        try
        {
            var client = await clientService.UpdateMasterProfileAsync(
                id,
                request,
                cancellationToken);

            return client is null ? NotFound() : Ok(client);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/whatsapp-initiated")]
    [ProducesResponseType(typeof(ClientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDetailResponse>> RecordWhatsAppInitiated(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = await clientService.RecordWhatsAppInitiatedAsync(id, cancellationToken);
            return client is null ? NotFound() : Ok(client);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/whatsapp-follow-up")]
    [ProducesResponseType(typeof(ClientDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDetailResponse>> RecordWhatsAppFollowUp(
        Guid id,
        [FromBody] RecordWhatsAppFollowUpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequestProblem("Follow-up status is required.");
        }

        try
        {
            var client = await clientService.RecordWhatsAppFollowUpAsync(
                id,
                request.Status,
                request.Note,
                cancellationToken);

            return client is null ? NotFound() : Ok(client);
        }
        catch (DuplicateWhatsAppFollowUpException ex)
        {
            return ConflictProblem(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private static string? ValidateListQuery(
        string? sortBy,
        string? sortDirection,
        int? createdWithinDays,
        int? registeredWithinDays,
        string? leadStatus)
    {
        if (createdWithinDays is <= 0)
        {
            return "createdWithinDays must be a positive integer.";
        }

        if (registeredWithinDays is <= 0)
        {
            return "registeredWithinDays must be a positive integer.";
        }

        if (!string.IsNullOrWhiteSpace(leadStatus))
        {
            var normalizedStatus = leadStatus.Trim().ToLowerInvariant();
            if (normalizedStatus is not ("new" or "contacted" or "active" or "inactive"))
            {
                return "leadStatus must be new, contacted, active, or inactive.";
            }
        }

        if (!string.IsNullOrWhiteSpace(sortBy))
        {
            var normalized = sortBy.Trim().ToLowerInvariant();
            if (normalized is not ("name" or "status" or "lastregistrationdate" or "last_registration_date"))
            {
                return "sortBy must be name, status, or lastRegistrationDate.";
            }
        }

        if (!string.IsNullOrWhiteSpace(sortDirection))
        {
            var normalizedDirection = sortDirection.Trim();
            if (!string.Equals(normalizedDirection, "asc", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(normalizedDirection, "desc", StringComparison.OrdinalIgnoreCase))
            {
                return "sortDirection must be asc or desc.";
            }
        }

        return null;
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

    private ObjectResult ConflictProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        })
        {
            StatusCode = StatusCodes.Status409Conflict,
        };
    }
}
