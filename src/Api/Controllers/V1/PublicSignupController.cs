using Cohestra.Application.Compliance;
using Cohestra.Contracts.Legal;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/signup")]
public sealed class PublicSignupController(ILegalComplianceService legalCompliance) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Signup([FromBody] PublicSignupRequest? request)
    {
        if (request is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = "Request body is required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var legalError = legalCompliance.ValidateAcceptance(new LegalAcceptanceInput(
            request.AcceptTermsAndPrivacy,
            request.TermsVersion,
            request.PrivacyVersion));

        if (legalError is not null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Legal acceptance required",
                Detail = legalError,
                Status = StatusCodes.Status400BadRequest,
            });
        }

        return StatusCode(StatusCodes.Status501NotImplemented, new ProblemDetails
        {
            Title = "Signup not yet available",
            Detail = "Self-serve signup is being enabled. Legal acceptance was recorded as valid.",
            Status = StatusCodes.Status501NotImplemented,
            Type = "https://cohestra.app/errors/signup-not-implemented",
        });
    }
}
