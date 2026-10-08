using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Rejects sandbox/live Paddle credential mismatches. Live keys are never valid in Development/Testing.
/// UAT runs ASPNETCORE Production with sandbox Paddle — that combination is allowed.
/// </summary>
public static class PaddleCredentialGuard
{
    public static void Validate(PaddleSettings settings, IHostEnvironment environment)
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
            if (sandboxApi || sandboxClient)
            {
                throw new InvalidOperationException(
                    "Sandbox Paddle credentials cannot be used when Paddle:Environment is production.");
            }
        }

        var nonProductionHost =
            environment.IsDevelopment()
            || string.Equals(environment.EnvironmentName, "Testing", StringComparison.OrdinalIgnoreCase);
        if (nonProductionHost && (!sandbox || liveApi || liveClient))
        {
            throw new InvalidOperationException(
                "Live Paddle is not allowed in Development or Testing hosts.");
        }
    }
}
