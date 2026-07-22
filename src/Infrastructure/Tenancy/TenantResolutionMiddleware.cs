using System.Security.Claims;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Epic 13.1: resolve ambient Tenant Context after authentication, before authorization.
/// Owns Host resolve + admin JWT↔Host alignment (absorbs TenantJwtHostAlignmentMiddleware).
/// Public unresolved → 404; admin mismatch → 403; admin unauthenticated → 401.
/// Platform/system/anonymous auth skip tenant requirement. Never trusts X-Tenant-Id.
/// </summary>
public sealed class TenantResolutionMiddleware(RequestDelegate next)
{
    public const string TenantIdClaimType = "tenant_id";
    public const string TenantUnresolvedErrorCode = "tenant_unresolved";
    public const string TenantMismatchErrorCode = "tenant_mismatch";

    private static readonly PathString PublicPath = new("/api/v1/public");
    private static readonly PathString AdminPath = new("/api/v1/admin");
    private static readonly PathString PlatformPath = new("/api/v1/platform");
    private static readonly PathString SystemPath = new("/api/v1/system");
    private static readonly PathString ChangePasswordPath = new("/api/v1/auth/change-password");

    public async Task InvokeAsync(
        HttpContext context,
        ITenantHostResolver hostResolver,
        CurrentTenant currentTenant,
        ILogger<TenantResolutionMiddleware> logger)
    {
        // Never trust client X-Tenant-Id for tenancy decisions (AD-3).
        _ = context.Request.Headers.TryGetValue("X-Tenant-Id", out _);

        var path = context.Request.Path;

        if (IsSkipTenantRequirementPath(path))
        {
            if (TenantHostResolver.IsMarketingApexHost(TenantRequestHost.GetEffectiveHost(context)))
            {
                currentTenant.SetMarketingHost();
                using (logger.BeginScope(new Dictionary<string, object?> { ["isMarketingHost"] = true }))
                {
                    await next(context);
                }

                return;
            }

            await next(context);
            return;
        }

        if (IsPublicDoorPath(path))
        {
            await next(context);
            return;
        }

        if (IsPublicPath(path))
        {
            await HandlePublicAsync(context, hostResolver, currentTenant, logger);
            return;
        }

        if (RequiresAdminTenantAlignment(path))
        {
            await HandleAdminAsync(context, hostResolver, currentTenant, logger);
            return;
        }

        await next(context);
    }

    private async Task HandlePublicAsync(
        HttpContext context,
        ITenantHostResolver hostResolver,
        CurrentTenant currentTenant,
        ILogger<TenantResolutionMiddleware> logger)
    {
        var resolution = await hostResolver.ResolveAsync(
            TenantRequestHost.GetEffectiveHost(context),
            context.RequestAborted);
        if (resolution.IsMarketingHost)
        {
            currentTenant.SetMarketingHost();
            await WriteProblemAsync(
                context,
                StatusCodes.Status404NotFound,
                "Not Found",
                "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                resolution.ErrorDetail ?? "Marketing host has no tenant SitePage context.",
                TenantUnresolvedErrorCode);
            return;
        }

        if (!resolution.Succeeded || resolution.TenantId is null || string.IsNullOrWhiteSpace(resolution.Slug))
        {
            await WriteProblemAsync(
                context,
                StatusCodes.Status404NotFound,
                "Not Found",
                "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                resolution.ErrorDetail ?? "Could not resolve tenant from Host.",
                TenantUnresolvedErrorCode);
            return;
        }

        currentTenant.SetResolved(resolution.TenantId.Value, resolution.Slug);
        using (logger.BeginScope(new Dictionary<string, object?>
        {
            ["tenantId"] = resolution.TenantId.Value,
            ["tenantSlug"] = resolution.Slug,
        }))
        {
            await next(context);
        }
    }

    private async Task HandleAdminAsync(
        HttpContext context,
        ITenantHostResolver hostResolver,
        CurrentTenant currentTenant,
        ILogger<TenantResolutionMiddleware> logger)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await WriteProblemAsync(
                context,
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "https://tools.ietf.org/html/rfc7235#section-3.1",
                "Authentication is required for this resource.",
                "unauthorized");
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

        var resolution = await hostResolver.ResolveAsync(
            TenantRequestHost.GetEffectiveHost(context),
            context.RequestAborted);
        if (resolution.IsMarketingHost
            || !resolution.Succeeded
            || resolution.TenantId is null
            || string.IsNullOrWhiteSpace(resolution.Slug))
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

        currentTenant.SetResolved(resolution.TenantId.Value, resolution.Slug);
        using (logger.BeginScope(new Dictionary<string, object?>
        {
            ["tenantId"] = resolution.TenantId.Value,
            ["tenantSlug"] = resolution.Slug,
        }))
        {
            await next(context);
        }
    }

    internal static bool IsPublicPath(PathString path) =>
        path.StartsWithSegments(PublicPath);

    internal static bool IsPublicDoorPath(PathString path)
    {
        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.Equals("/api/v1/public/door", StringComparison.OrdinalIgnoreCase);
    }

    internal static bool RequiresAdminTenantAlignment(PathString path) =>
        path.StartsWithSegments(AdminPath)
        || path.Equals(ChangePasswordPath)
        || string.Equals(path.Value?.TrimEnd('/'), ChangePasswordPath.Value, StringComparison.OrdinalIgnoreCase);

    internal static bool IsSkipTenantRequirementPath(PathString path)
    {
        if (path.StartsWithSegments(PlatformPath) || path.StartsWithSegments(SystemPath))
        {
            return true;
        }

        if (IsStripeWebhookPath(path))
        {
            return true;
        }

        if (IsAnonymousAuthPath(path))
        {
            return true;
        }

        if (IsMarketingApexPublicPath(path))
        {
            return true;
        }

        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/favicon.ico", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Anonymous auth surfaces — Host binding remains in AuthService.</summary>
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

    /// <summary>Stripe webhooks — no tenant Host required (Story 14.4).</summary>
    internal static bool IsStripeWebhookPath(PathString path)
    {
        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.Equals("/api/v1/system/stripe/webhook", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Marketing apex self-serve — no tenant Host required (Story 14.3).</summary>
    internal static bool IsMarketingApexPublicPath(PathString path)
    {
        var value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.Equals("/api/v1/public/signup", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("/api/v1/public/signup/", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/v1/public/legal/versions", StringComparison.OrdinalIgnoreCase);
    }

    private static Task WriteForbiddenAsync(HttpContext context, string detail) =>
        WriteProblemAsync(
            context,
            StatusCodes.Status403Forbidden,
            "Forbidden",
            "https://tools.ietf.org/html/rfc7231#section-6.5.3",
            detail,
            TenantMismatchErrorCode);

    private static async Task WriteProblemAsync(
        HttpContext context,
        int status,
        string title,
        string type,
        string detail,
        string errorCode)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        var problem = new
        {
            type,
            title,
            status,
            detail,
            instance = context.Request.Path.Value,
            errorCode,
            traceId = context.TraceIdentifier,
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

public static class TenantResolutionMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder app) =>
        app.UseMiddleware<TenantResolutionMiddleware>();
}
