using System.Security.Claims;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class RequireProPlanFilterTests
{
    [Fact]
    public async Task Allows_when_plan_gate_ok()
    {
        var filter = new RequireProPlanFilter(new StubPlanGate(TenantPlanGateResult.Ok()));
        var context = CreateContext(TenantIds.Default);
        var called = false;

        await filter.OnActionExecutionAsync(context, () =>
        {
            called = true;
            return Task.FromResult(new ActionExecutedContext(context, [], null!));
        });

        Assert.True(called);
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task Forbidden_when_plan_locked()
    {
        var filter = new RequireProPlanFilter(
            new StubPlanGate(TenantPlanGateResult.Locked("Campaigns require a Pro plan or higher.")));
        var context = CreateContext(TenantIds.Default);

        await filter.OnActionExecutionAsync(context, () =>
            Task.FromResult(new ActionExecutedContext(context, [], null!)));

        Assert.False(context.Result is null);
        var objectResult = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("plan_locked", problem.Extensions["errorCode"]?.ToString());
    }

    [Fact]
    public async Task Forbidden_when_tenant_id_missing()
    {
        var filter = new RequireProPlanFilter(new StubPlanGate(TenantPlanGateResult.Ok()));
        var context = CreateContext(tenantId: null);

        await filter.OnActionExecutionAsync(context, () =>
            Task.FromResult(new ActionExecutedContext(context, [], null!)));

        var objectResult = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);
    }

    private static ActionExecutingContext CreateContext(Guid? tenantId)
    {
        var http = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(JwtTokenService.MembershipRoleClaimType, TenantMembershipRole.TenantMember.ToString()),
        };
        if (tenantId is not null)
        {
            claims.Add(new Claim(JwtTokenService.TenantIdClaimType, tenantId.Value.ToString()));
        }

        http.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));

        var actionContext = new ActionContext(http, new RouteData(), new ActionDescriptor());
        return new ActionExecutingContext(actionContext, [], new Dictionary<string, object?>(), controller: new object());
    }

    private sealed class StubPlanGate(TenantPlanGateResult result) : ITenantPlanGate
    {
        public Task<TenantPlanGateResult> EvaluateCampaignsAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(result);
    }
}
