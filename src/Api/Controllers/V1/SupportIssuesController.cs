using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Cohestra.Api.Infrastructure;
using Cohestra.Application.Support;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Support;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/support-issues")]
[Authorize(Policy = TenantAuthPolicies.TenantOperator)]
[Produces("application/json")]
public sealed class SupportIssuesController(
    ISupportIssueService supportIssueService,
    ISupportSubmissionRateLimiter rateLimiter,
    ICurrentTenant currentTenant,
    IOptions<SupportSettings> supportSettings,
    IOptions<SupportSubmissionRateLimitOptions> rateLimitOptions) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(8 * 1024 * 1024)]
    [ProducesResponseType(typeof(SupportIssueResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SupportIssueResponse>> Create(
        [FromForm] string? subject,
        [FromForm] string? description,
        [FromForm] List<IFormFile>? files,
        CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var operatorUserId = ResolveOperatorUserId();
        if (operatorUserId is null)
        {
            return Forbid();
        }

        var operatorEmail = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
            ?? User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(operatorEmail))
        {
            return BadRequestProblem("Operator email is required.");
        }

        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(description))
        {
            return BadRequestProblem("Subject and description are required.");
        }

        var settings = supportSettings.Value;
        var uploadFiles = files ?? [];
        if (uploadFiles.Count > settings.MaxFiles)
        {
            return BadRequestProblem($"You can attach up to {settings.MaxFiles} screenshots.");
        }

        var reservation = await rateLimiter.TryReserveSubmissionAsync(
            tenantId,
            operatorUserId.Value,
            cancellationToken);
        if (reservation is null)
        {
            return RateLimitedProblem();
        }

        var operatorDisplayName = User.FindFirst(JwtRegisteredClaimNames.Name)?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? operatorEmail;

        var preparedFiles = new List<SupportIssueUploadFile>();
        foreach (var file in uploadFiles)
        {
            if (file.Length == 0)
            {
                continue;
            }

            if (file.Length > settings.MaxFileBytes)
            {
                await rateLimiter.ReleaseSubmissionAsync(reservation, cancellationToken);
                return BadRequestProblem("Each screenshot must be 2MB or smaller.");
            }

            await using var stream = file.OpenReadStream();
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, cancellationToken);
            preparedFiles.Add(new SupportIssueUploadFile(
                buffer.ToArray(),
                file.FileName,
                file.ContentType ?? "application/octet-stream"));
        }

        try
        {
            var result = await supportIssueService.CreateAsync(
                new SupportIssueCreateRequest(
                    tenantId,
                    operatorUserId.Value,
                    operatorEmail,
                    operatorDisplayName,
                    subject,
                    description,
                    Request.Headers.UserAgent.ToString(),
                    preparedFiles),
                cancellationToken);

            var response = new SupportIssueResponse(
                result.Id,
                result.IssueNumber,
                result.Status,
                result.CreatedAt);

            return CreatedAtAction(nameof(List), null, response);
        }
        catch (ArgumentException ex)
        {
            await rateLimiter.ReleaseSubmissionAsync(reservation, cancellationToken);
            return BadRequestProblem(ex.Message);
        }
        catch
        {
            await rateLimiter.ReleaseSubmissionAsync(reservation, cancellationToken);
            throw;
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(SupportIssueListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SupportIssueListResponse>> List(CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var operatorUserId = ResolveOperatorUserId();
        if (operatorUserId is null)
        {
            return Forbid();
        }

        var items = await supportIssueService.ListMineAsync(
            tenantId,
            operatorUserId.Value,
            limit: 10,
            cancellationToken);

        return Ok(new SupportIssueListResponse(
            items.Select(item => new SupportIssueListItemResponse(
                item.Id,
                item.IssueNumber,
                item.Subject,
                item.Status,
                item.CreatedAt)).ToList()));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SupportIssueDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportIssueDetailResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            return Forbid();
        }

        var operatorUserId = ResolveOperatorUserId();
        if (operatorUserId is null)
        {
            return Forbid();
        }

        var detail = await supportIssueService.GetMineByIdAsync(
            tenantId,
            operatorUserId.Value,
            id,
            cancellationToken);

        if (detail is null)
        {
            return NotFoundProblem("Support issue not found.");
        }

        return Ok(new SupportIssueDetailResponse(
            detail.Id,
            detail.IssueNumber,
            detail.Subject,
            detail.Description,
            detail.Status,
            detail.CreatedAt,
            detail.UpdatedAt,
            detail.Replies.Select(reply => new SupportIssueReplyResponse(reply.Body, reply.CreatedAt)).ToList()));
    }

    private Guid? ResolveOperatorUserId()
    {
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(sub, out var userId) ? userId : null;
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

    private ObjectResult NotFoundProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Not Found",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        })
        {
            StatusCode = StatusCodes.Status404NotFound,
        };
    }

    private ObjectResult RateLimitedProblem()
    {
        Response.ContentType = "application/problem+json";
        var limits = rateLimitOptions.Value;
        var windowLabel = limits.WindowSeconds >= 3600 && limits.WindowSeconds % 3600 == 0
            ? $"{limits.WindowSeconds / 3600} hour{(limits.WindowSeconds / 3600 == 1 ? "" : "s")}"
            : $"{limits.WindowSeconds} seconds";

        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many support requests",
            Detail =
                $"You can submit up to {limits.MaxSubmissions} support requests per {windowLabel}. Please wait before trying again.",
            Instance = HttpContext.Request.Path,
        })
        {
            StatusCode = StatusCodes.Status429TooManyRequests,
        };
    }
}
