using System.Security.Claims;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Thin AD-3 alignment: authenticated tenant admin requests must have JWT tenant_id matching Host.
/// PlatformAdmin Identity and /api/v1/platform/* skip. Does not implement full Epic 13 middleware.
/// </summary>
public sealed class TenantJwtHostAlignmentMiddleware(RequestDelegate next)
{
    public const string TenantIdClaimType = "tenant_id";

    private static readonly PathString PlatformPath = new("/api/v1/platform");
    private static readonly PathString PublicPath = new("/api/v1/public");

    private static readonly HashSet<string> AnonymousAuthPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/v1/auth/onboarding",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/verify-email",
        "/api/v1/auth/resend-otp",
        "/api/v1/auth/refresh",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
    };

    public async Task InvokeAsync(HttpContext context, ITenantHostResolver hostResolver)
    {
        var path = context.Request.Path;

        if (!path.StartsWithSegments("/api/v1")
            || path.StartsWithSegments(PlatformPath)
            || path.StartsWithSegments(PublicPath)
            || path.StartsWithSegments("/health")
            || path.StartsWithSegments("/ready")
            || path.StartsWithSegments("/openapi")
            || IsAnonymousAuthPath(path))
        {
            await next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        if (context.User.IsInRole(PlatformAdminSeeder.PlatformAdminRole)
            && !context.User.IsInRole(OperatorSeeder.TenantAdminRole))
        {
            await next(context);
            return;
        }

        var tenantClaim = context.User.FindFirstValue(TenantIdClaimType);
        if (string.IsNullOrWhiteSpace(tenantClaim) || !Guid.TryParse(tenantClaim, out var claimTenantId))
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

    internal static bool IsAnonymousAuthPath(PathString path)
    {
        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return AnonymousAuthPaths.Contains(value);
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
