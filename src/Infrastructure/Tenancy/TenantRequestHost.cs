using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Resolves the browser-facing Host for tenant slug extraction.
/// Next.js SSR cannot override the HTTP Host header when calling the internal API URL,
/// so the web tier forwards the original host via X-Forwarded-Host (Story 15.1).
/// </summary>
public static class TenantRequestHost
{
    public const string ForwardedHostHeaderName = "X-Forwarded-Host";

    public static string? GetEffectiveHost(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(ForwardedHostHeaderName, out var forwardedValues))
        {
            var forwarded = forwardedValues.ToString();
            if (!string.IsNullOrWhiteSpace(forwarded))
            {
                return forwarded;
            }
        }

        return context.Request.Host.Value;
    }
}
