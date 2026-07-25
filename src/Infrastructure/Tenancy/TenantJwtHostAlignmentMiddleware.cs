using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Obsolete shim — Story 13.1 absorbed alignment into <see cref="TenantResolutionMiddleware"/>.
/// Kept so any leftover call sites compile; prefer <see cref="TenantResolutionMiddlewareExtensions.UseTenantResolution"/>.
/// </summary>
[Obsolete("Use TenantResolutionMiddleware / UseTenantResolution instead.")]
public static class TenantJwtHostAlignmentMiddleware
{
    public const string TenantIdClaimType = TenantResolutionMiddleware.TenantIdClaimType;

    public static bool RequiresTenantHostAlignment(PathString path) =>
        TenantResolutionMiddleware.RequiresAdminTenantAlignment(path);

    public static bool IsAnonymousAuthPath(PathString path) =>
        TenantResolutionMiddleware.IsAnonymousAuthPath(path);
}

/// <summary>Obsolete shim — redirects to <see cref="TenantResolutionMiddleware"/>.</summary>
[Obsolete("Use UseTenantResolution instead.")]
public static class TenantJwtHostAlignmentMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantJwtHostAlignment(this IApplicationBuilder app) =>
        app.UseTenantResolution();
}
