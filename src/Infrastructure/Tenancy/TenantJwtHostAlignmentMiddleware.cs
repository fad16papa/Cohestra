using System.Security.Claims;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Thin AD-3 alignment for tenant-scoped surfaces: JWT tenant_id must match Host.
/// Scoped to /api/v1/admin/* and change-password (not /system, /platform, public).
/// PlatformAdmin without tenant_id cannot pass admin paths — no impersonation.
/// Does not implement full Epic 13 middleware.
/// </summary>
public sealed class TenantJwtHostAlignmentMiddleware(RequestDelegate next)
{
    public const string TenantIdClaimType = "tenant_id";

    private static readonly PathString AdminPath = new("/api/v1/admin");
    private static readonly PathString ChangePasswordPath = new("/api/v1/auth/change-password");

    public async Task InvokeAsync(HttpContext context, ITenantHostResolver hostResolver)
    {
        var path = context.Request.Path;

        if (!RequiresTenantHostAlignment(path))
        {
            await next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var tenantClaim = context.User.FindFirstValue(TenantIdClaimType);
        if (string.IsNullOrWhiteSpace(tenantClaim)
            || !Guid.TryParse(tenantClaim, out var claimTenantId)
            || claimTenantId == Guid.Empty)
        {
            await WriteForbiddenAsync(context, "JWT tenant_id claim is required for this resource.");
            return;
        }

        // Never trust client X-Tenant-Id for tenancy decisions (AD-3).
        _ = context.Request.Headers.TryGetValue("X-Tenant-Id", out _);

        var resolution = await hostResolver.ResolveAsync(context.Request.Host.Value, context.RequestAborted);
        if (!resolution.Succeeded || resolution.TenantId is null)
        {
            await WriteForbiddenAsync(
                context,
                resolution.ErrorDetail ?? "Could not resolve tenant from Host.");
            return;
        }

        if (resolution.TenantId.Value != claimTenantId)
        {
            await WriteForbiddenAsync(context, "JWT tenant_id does not match the Host tenant.");
            return;
        }

        await next(context);
    }

    internal static bool RequiresTenantHostAlignment(PathString path) =>
        path.StartsWithSegments(AdminPath)
        || path.Equals(ChangePasswordPath)
        || string.Equals(path.Value?.TrimEnd('/'), ChangePasswordPath.Value, StringComparison.OrdinalIgnoreCase);

    /// <summary>Legacy helper used by tests for anonymous auth path inventory.</summary>
    internal static bool IsAnonymousAuthPath(PathString path)
    {
        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.Equals("/api/v1/auth/onboarding", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/login", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/register", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/verify-email", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/resend-otp", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/refresh", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/forgot-password", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/auth/reset-password", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task WriteForbiddenAsync(HttpContext context, string detail)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/problem+json";
        var problem = new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
            title = "Forbidden",
            status = 403,
            detail,
            instance = context.Request.Path.Value,
            errorCode = "tenant_mismatch",
            traceId = context.TraceIdentifier,
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

public static class TenantJwtHostAlignmentMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantJwtHostAlignment(this IApplicationBuilder app) =>
        app.UseMiddleware<TenantJwtHostAlignmentMiddleware>();
}
