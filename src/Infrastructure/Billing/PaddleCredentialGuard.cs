using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Rejects sandbox/live Paddle credential mismatches. Live keys are never valid in Development/Testing.
/// UAT runs ASPNETCORE Production with sandbox Paddle — that combination is allowed.
/// AllowLive cannot enable live Paddle on a UAT public host (uat.cohestra.app / uat.*).
/// </summary>
public static class PaddleCredentialGuard
{
    public static void Validate(
        PaddleSettings settings,
        IHostEnvironment environment,
        string? publicBaseUrl = null)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(environment);

        var hasAny =
            !string.IsNullOrWhiteSpace(settings.ApiKey)
            || !string.IsNullOrWhiteSpace(settings.ClientToken)
            || !string.IsNullOrWhiteSpace(settings.WebhookSecret);
        if (!hasAny)
        {
            return;
        }

        var sandbox = settings.IsSandbox;
        var liveApi = settings.LooksLikeLiveApiKey;
        var sandboxApi = settings.LooksLikeSandboxApiKey;
        var liveClient = settings.LooksLikeLiveClientToken;
        var sandboxClient = settings.LooksLikeSandboxClientToken;
        var wantsLive = !sandbox || liveApi || liveClient;

        if (IsUatPublicHost(publicBaseUrl) && wantsLive)
        {
            throw new InvalidOperationException(
                "Live Paddle cannot be used on a UAT public host (uat.*), even when Paddle:AllowLive is set.");
        }

        if (sandbox)
        {
            if (liveApi || liveClient)
            {
                throw new InvalidOperationException(
                    "Live Paddle credentials cannot be used when Paddle:Environment is sandbox (or unset).");
            }
        }
        else
        {
            if (!settings.AllowLive)
            {
                throw new InvalidOperationException(
                    "Paddle:Environment=production requires Paddle:AllowLive=true after owner-approved cutover.");
            }

            if (sandboxApi || sandboxClient)
            {
                throw new InvalidOperationException(
                    "Sandbox Paddle credentials cannot be used when Paddle:Environment is production.");
            }
        }

        var nonProductionHost =
            environment.IsDevelopment()
            || string.Equals(environment.EnvironmentName, "Testing", StringComparison.OrdinalIgnoreCase);
        if (nonProductionHost && wantsLive)
        {
            throw new InvalidOperationException(
                "Live Paddle is not allowed in Development or Testing hosts.");
        }
    }

    public static bool IsUatPublicHost(string? publicBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(publicBaseUrl)
            || !Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var host = uri.IdnHost;
        return host.Equals("uat.cohestra.app", StringComparison.OrdinalIgnoreCase)
            || host.StartsWith("uat.", StringComparison.OrdinalIgnoreCase);
    }
}
