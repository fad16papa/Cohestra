namespace Cohestra.Application.Auth;

/// <summary>
/// Raised when a Redis-backed auth session store cannot reach Redis in a non-fallback environment.
/// Mapped to HTTP 503 (fail-closed) by the API exception handler.
/// </summary>
public sealed class AuthSessionStoreUnavailableException : Exception
{
    public AuthSessionStoreUnavailableException(string storeName, Exception innerException)
        : base($"Auth session store '{storeName}' is unavailable because Redis could not be reached.", innerException)
    {
        StoreName = storeName;
    }

    public string StoreName { get; }
}
