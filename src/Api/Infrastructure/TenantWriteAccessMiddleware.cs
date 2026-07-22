using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Infrastructure;

/// <summary>
/// Blocks mutating admin API calls when tenant is read-only (OnHold or ReadOnly_OverLimit).
/// </summary>
public sealed class TenantWriteAccessMiddleware(
    RequestDelegate next,
    ILogger<TenantWriteAccessMiddleware> logger)
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete,
    };

    public async Task InvokeAsync(HttpContext context, ITenantAccessService accessService, ICurrentTenant currentTenant)
    {
        if (ShouldCheckWriteAccess(context)
            && currentTenant.IsResolved
            && currentTenant.TenantId is Guid tenantId
            && context.User.Identity?.IsAuthenticated == true)
        {
            var evaluation = await accessService.EvaluateAsync(tenantId, context.RequestAborted);
            if (evaluation.AdminAccess == TenantAccessMode.ReadOnly)
            {
                logger.LogInformation(
                    "Blocked write {Method} {Path} for tenant {TenantId} (read-only)",
                    context.Request.Method,
                    context.Request.Path,
                    tenantId);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Read-only workspace",
                    Detail = "Billing or plan limits require read-only mode. Settle billing or reduce usage to restore writes.",
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = "read_only",
                    },
                });
                return;
            }
        }

        await next(context);
    }

    private static bool ShouldCheckWriteAccess(HttpContext context)
    {
        if (!MutatingMethods.Contains(context.Request.Method))
        {
            return false;
        }

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/v1/admin/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Billing checkout + portal must remain reachable for admins to recover.
        if (path.StartsWith("/api/v1/admin/billing", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }
}

public static class TenantWriteAccessMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantWriteAccess(this IApplicationBuilder app) =>
        app.UseMiddleware<TenantWriteAccessMiddleware>();
}
