namespace Cohestra.Application.RateLimiting;

/// <summary>
/// Raised when a Redis-backed rate limiter cannot reach Redis during a check or mutation.
/// Mapped to HTTP 503 (fail-closed) by the API exception handler.
/// </summary>
public sealed class RateLimiterUnavailableException : Exception
{
    public RateLimiterUnavailableException(string limiterName, Exception innerException)
        : base($"Rate limiter '{limiterName}' is unavailable because Redis could not be reached.", innerException)
    {
        LimiterName = limiterName;
    }

    public string LimiterName { get; }
}
