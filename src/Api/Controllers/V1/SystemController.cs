using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/system")]
[Produces("application/json")]
public class SystemController : ControllerBase
{
    [HttpGet("info")]
    [ProducesResponseType(typeof(SystemInfoResponse), StatusCodes.Status200OK)]
    public ActionResult<SystemInfoResponse> GetInfo()
    {
        return Ok(new SystemInfoResponse("Cohestra", "v1"));
    }
}

public sealed record SystemInfoResponse(string Name, string ApiVersion);
