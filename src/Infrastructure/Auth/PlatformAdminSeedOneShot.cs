using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// UAT-only invocation of <see cref="PlatformAdminSeeder"/> that exits before HTTP hosting.
/// Does not replace the running API process and does not persist seed credentials.
/// </summary>
public static class PlatformAdminSeedOneShot
{
    public const string ConfigurationKey = "PLATFORM_ADMIN_SEED_ONESHOT";

    public static bool IsRequested(IConfiguration configuration) =>
        configuration.GetValue(ConfigurationKey, false)
        || configuration.GetValue("PlatformAdminSeed:OneShot", false);

    public static void EnsureAllowed(IConfiguration configuration)
    {
        if (!IsRequested(configuration))
        {
            return;
        }

        if (!configuration.GetValue("PlatformAdminSeed:Enabled", false))
        {
            throw new InvalidOperationException(
                "PlatformAdmin one-shot seed refused: PlatformAdminSeed:Enabled must be true.");
        }

        var publicBaseUrl = configuration["PublicWeb:BaseUrl"];
        if (!IsUatPublicBase(publicBaseUrl))
        {
            throw new InvalidOperationException(
                "PlatformAdmin one-shot seed refused: PublicWeb:BaseUrl is not a UAT host.");
        }
    }

    public static bool IsUatPublicBase(string? publicBaseUrl)
    {
        if (!Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
        {
            return false;
        }

        return uri.Host.Equals("uat.cohestra.app", StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("www.uat.cohestra.app", StringComparison.OrdinalIgnoreCase);
    }
}
