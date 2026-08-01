using Cohestra.Application.RateLimiting;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Infrastructure;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is RateLimiterUnavailableException rateLimiterUnavailable)
        {
            logger.LogWarning(
                rateLimiterUnavailable,
                "Rate limiter {LimiterName} unavailable during {Method} {Path}",
                rateLimiterUnavailable.LimiterName,
                httpContext.Request.Method,
                httpContext.Request.Path);

            var unavailable = new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Rate limiting temporarily unavailable",
                Detail = "Try again shortly. If the problem persists, contact support.",
                Instance = httpContext.Request.Path,
                Type = "https://cohestra.app/errors/rate-limiter-unavailable",
            };
            unavailable.Extensions["errorCode"] = RateLimitErrorCodes.Unavailable;
            unavailable.Extensions["traceId"] = httpContext.TraceIdentifier;

            httpContext.Response.StatusCode = unavailable.Status.Value;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(unavailable, cancellationToken);
            return true;
        }

        logger.LogError(exception, "Unhandled exception processing {Method} {Path}",
            httpContext.Request.Method,
            httpContext.Request.Path);

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Detail = httpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment()
                ? exception.Message
                : "See server logs for details.",
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;

        httpContext.Response.StatusCode = problemDetails.Status.Value;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
