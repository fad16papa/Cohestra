using LeadGenerationCrm.Application.Email;
using LeadGenerationCrm.Contracts.Email;
using LeadGenerationCrm.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadGenerationCrm.Api.Controllers.V1;

[ApiController]
[Route("api/v1/admin/email-delivery")]
[Authorize(Roles = OperatorSeeder.AdminRole)]
[Produces("application/json")]
public class EmailDeliveryController(IEmailDeliveryStatusService deliveryStatusService) : ControllerBase
{
    [HttpGet("status")]
    [ProducesResponseType(typeof(EmailDeliveryStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmailDeliveryStatusResponse>> GetStatus(
        CancellationToken cancellationToken)
    {
        var status = await deliveryStatusService.GetStatusAsync(cancellationToken);
        return Ok(status);
    }
}
