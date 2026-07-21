using Cohestra.Contracts.Billing;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

/// <summary>
/// Epic 14 will replace this stub with Stripe Customer Portal / Checkout.
/// Policy name <see cref="TenantAuthPolicies.TenantAdminOnly"/> must be preserved.
/// </summary>
[ApiController]
[Route("api/v1/admin/billing")]
[Authorize(Policy = TenantAuthPolicies.TenantAdminOnly)]
[Produces("application/json")]
public class BillingController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(BillingStubResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<BillingStubResponse> Get() =>
        Ok(new BillingStubResponse("stub", "Billing Portal is not available yet."));
}
