using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Distinguishes the dedicated Production droplet plane from UAT, which also
/// runs <c>ASPNETCORE_ENVIRONMENT=Production</c> with sandbox Paddle.
/// Locked in <c>docker-compose.production.yml</c> as <c>Cohestra__DeploymentPlane=Production</c>.
/// </summary>
public static class DeploymentPlane
{
    public const string ConfigKey = "Cohestra:DeploymentPlane";
    public const string Production = "Production";

    public static bool IsDedicatedProduction(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        return string.Equals(configuration[ConfigKey], Production, StringComparison.OrdinalIgnoreCase);
    }
}
