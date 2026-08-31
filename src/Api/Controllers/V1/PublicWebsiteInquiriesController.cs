using Cohestra.Application.WebsiteInquiries;
using Cohestra.Contracts.WebsiteInquiries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>Anonymous public website contact form submissions.</summary>
[ApiController]
[Route("api/v1/public/website-inquiries")]
[AllowAnonymous]
[Produces("application/json")]
[Tags("Public Website Inquiries")]
public class PublicWebsiteInquiriesController(
    IWebsiteInquiryService websiteInquiryService) : ControllerBase
{
    [EndpointSummary("Submit a website contact inquiry")]
    [EndpointDescription(
        "Upserts a Client from the homepage Contact section and writes a website inquiry timeline event.")]
    [HttpPost]
    [ProducesResponseType(typeof(SubmitWebsiteInquiryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SubmitWebsiteInquiryResponse>> Submit(
        [FromBody] SubmitWebsiteInquiryRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid inquiry payload",
                Detail = "name and message are required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var result = await websiteInquiryService.SubmitAsync(
            new SubmitWebsiteInquiryCommand(
                request.Name,
                request.Email,
                request.Phone,
                request.Message ?? string.Empty,
                request.ConsentGiven),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound();
        }

        if (result.IsPlanLocked)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Plan locked",
                Detail = "Website contact forms require a Core plan or higher.",
                Status = StatusCodes.Status403Forbidden,
                Extensions = { ["errorCode"] = "plan_locked" },
            });
        }

        if (result.IsContactDisabled)
        {
            return NotFound();
        }

        if (result.ValidationError is not null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid inquiry",
                Detail = result.ValidationError,
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var response = new SubmitWebsiteInquiryResponse(
            Status: "created",
            Message: "Thank you — we've received your message.",
            ClientId: result.ClientId,
            ClientCreated: result.ClientCreated);

        return StatusCode(StatusCodes.Status201Created, response);
    }
}
