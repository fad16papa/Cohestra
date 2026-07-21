using Cohestra.Application.Compliance;
using Cohestra.Contracts.Legal;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/legal")]
public sealed class PublicLegalController(ILegalComplianceService legalCompliance) : ControllerBase
{
    [HttpGet("versions")]
    [ProducesResponseType(typeof(LegalComplianceVersionsResponse), StatusCodes.Status200OK)]
    public ActionResult<LegalComplianceVersionsResponse> GetVersions()
    {
        var versions = legalCompliance.GetCurrentVersions();
        return Ok(new LegalComplianceVersionsResponse(
            versions.TermsVersion,
            versions.PrivacyVersion,
            TermsPath: "/terms",
            PrivacyPath: "/privacy"));
    }
}
