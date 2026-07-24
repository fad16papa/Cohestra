using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.Infrastructure;

public sealed class PublicRegistrationRateLimitMiddleware(
    RequestDelegate next,
    IPublicRegistrationRateLimiter rateLimiter)
{
    private const string TargetPathValue = "/api/v1/public/registrations";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsRegistrationSubmit(context))
        {
            await next(context);
            return;
        }

        var currentTenant = context.RequestServices.GetRequiredService<ICurrentTenant>();
        if (!currentTenant.IsResolved || currentTenant.TenantId is null || currentTenant.TenantId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            context.Response.ContentType = "application/problem+json";

            var unresolved = new ProblemDetails
            {
                Title = "Not Found",
                Detail = "Could not resolve tenant from Host.",
                Status = StatusCodes.Status404NotFound,
                Instance = context.Request.Path,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4",
            };
            unresolved.Extensions["errorCode"] = TenantResolutionMiddleware.TenantUnresolvedErrorCode;
            unresolved.Extensions["traceId"] = context.TraceIdentifier;

            await context.Response.WriteAsJsonAsync(unresolved);
            return;
        }

        var clientIdentifier = ResolveClientIdentifier(context);
        var allowed = await rateLimiter.AllowRequestAsync(
            currentTenant.TenantId.Value,
            clientIdentifier,
            context.RequestAborted);

        if (!allowed)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Title = "Too many registration requests",
                Detail = "Please wait before submitting again.",
                Status = StatusCodes.Status429TooManyRequests,
                Instance = context.Request.Path,
            };
            problem.Extensions["traceId"] = context.TraceIdentifier;

            await context.Response.WriteAsJsonAsync(problem);
            return;
        }

        await next(context);
    }

    internal static bool IsRegistrationSubmit(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method))
        {
            return false;
        }

        var path = context.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
        return string.Equals(path, TargetPathValue, StringComparison.OrdinalIgnoreCase);
    }

    internal static string ResolveClientIdentifier(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstHop = forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(firstHop))
            {
                return firstHop;
            }
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

public static class PublicRegistrationRateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UsePublicRegistrationRateLimit(this IApplicationBuilder app) =>
        app.UseMiddleware<PublicRegistrationRateLimitMiddleware>();
}
