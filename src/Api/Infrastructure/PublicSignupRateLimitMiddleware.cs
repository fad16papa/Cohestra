using Cohestra.Application.Signup;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Infrastructure;

public sealed class PublicSignupRateLimitMiddleware(
    RequestDelegate next,
    IPublicSignupRateLimiter rateLimiter)
{
    private const string TargetPathValue = "/api/v1/public/signup";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsSignupSubmit(context))
        {
            await next(context);
            return;
        }

        var clientIdentifier = PublicRegistrationRateLimitMiddleware.ResolveClientIdentifier(context);
        var allowed = await rateLimiter.AllowSignupAsync(clientIdentifier, context.RequestAborted);

        if (!allowed)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Title = "Too many signups",
                Detail = "Signup limit reached for this network. Try again later.",
                Status = StatusCodes.Status429TooManyRequests,
                Instance = context.Request.Path,
                Type = "https://cohestra.app/errors/signup-rate-limited",
            };
            problem.Extensions["traceId"] = context.TraceIdentifier;
            problem.Extensions["errorCode"] = "signup_rate_limited";

            await context.Response.WriteAsJsonAsync(problem);
            return;
        }

        await next(context);
    }

    internal static bool IsSignupSubmit(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method))
        {
            return false;
        }

        var path = context.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
        return string.Equals(path, TargetPathValue, StringComparison.OrdinalIgnoreCase);
    }
}

public static class PublicSignupRateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UsePublicSignupRateLimit(this IApplicationBuilder app) =>
        app.UseMiddleware<PublicSignupRateLimitMiddleware>();
}
