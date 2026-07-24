using Cohestra.Application.Tenants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Server-side AD-8 slice: campaign APIs require Pro+. Emits 403 + errorCode plan_locked.
/// </summary>
public sealed class RequireProPlanFilter(ITenantPlanGate planGate) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var tenantClaim = context.HttpContext.User.FindFirst(JwtTokenService.TenantIdClaimType)?.Value;
        if (!Guid.TryParse(tenantClaim, out var tenantId))
        {
            context.Result = Forbidden("JWT tenant_id claim is required for this resource.", "tenant_required");
            return;
        }

        var evaluation = await planGate.EvaluateCampaignsAsync(
            tenantId,
            context.HttpContext.RequestAborted);

        if (!evaluation.Allowed)
        {
            context.Result = Forbidden(
                evaluation.Detail ?? "Plan does not allow this feature.",
                evaluation.ErrorCode ?? "plan_locked");
            return;
        }

        await next();
    }

    private static ObjectResult Forbidden(string detail, string errorCode)
    {
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Forbidden",
            Detail = detail,
        };
        problem.Extensions["errorCode"] = errorCode;

        return new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status403Forbidden,
            ContentTypes = { "application/problem+json" },
        };
    }
}

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireProPlanAttribute : TypeFilterAttribute
{
    public RequireProPlanAttribute()
        : base(typeof(RequireProPlanFilter))
    {
    }
}
