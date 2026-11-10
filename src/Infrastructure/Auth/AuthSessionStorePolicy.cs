using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// In-memory auth-session fallback is Development/Testing only.
/// Production and UAT (ASPNETCORE_ENVIRONMENT=Production) stay fail-closed on Redis faults.
/// </summary>
public static class AuthSessionStorePolicy
{
    public static bool AllowsInMemoryFallback(IHostEnvironment environment) =>
        environment.IsDevelopment() || environment.IsEnvironment("Testing");
}
