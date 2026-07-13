using Cohestra.Application.Email;
using Cohestra.Contracts.Email;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

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
