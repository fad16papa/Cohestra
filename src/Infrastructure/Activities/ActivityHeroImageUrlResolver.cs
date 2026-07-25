using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityHeroImageUrlResolver
{
    internal const string CampaignAssetPathPrefix = "/api/v1/public/campaign-assets/";

    /// <summary>
    /// Browser-facing surfaces (registration, site, admin preview) should use a
    /// same-origin relative campaign-asset path so tenant host resolution works.
    /// </summary>
    public static string? ResolveForBrowser(string? heroImageUrl)
    {
        var normalized = ActivityBrandingValidator.NormalizeHeroImageUrl(heroImageUrl);
        if (normalized is null)
        {
            return null;
        }

        if (TryGetCampaignAssetPath(normalized, out var assetPath))
        {
            return assetPath;
        }

        return normalized;
    }

    /// <summary>
    /// Absolute URL for email / outbound surfaces that cannot rely on page origin.
    /// Prefer <see cref="ResolveForEmail"/> when the tenant slug is known.
    /// </summary>
    public static string? Resolve(string? heroImageUrl, string publicApiBaseUrl)
    {
        var forBrowser = ResolveForBrowser(heroImageUrl);
        if (forBrowser is null)
        {
            return null;
        }

        if (!TryGetCampaignAssetPath(forBrowser, out var assetPath))
        {
            return forBrowser;
        }

        var baseUrl = publicApiBaseUrl.Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return assetPath;
        }

        return $"{baseUrl}{assetPath}";
    }

    /// <summary>
    /// Absolute tenant-host URL for email clients (SendGrid, etc.).
    /// Campaign assets are tenant-scoped and must load from the tenant origin.
    /// </summary>
    public static string? ResolveForEmail(
        string? heroImageUrl,
        string publicWebBaseUrl,
        string tenantSlug)
    {
        var forBrowser = ResolveForBrowser(heroImageUrl);
        if (forBrowser is null)
        {
            return null;
        }

        if (!TryGetCampaignAssetPath(forBrowser, out var assetPath))
        {
            return forBrowser;
        }

        return TenantPublicWebUrlBuilder.BuildTenantPath(publicWebBaseUrl, tenantSlug, assetPath);
    }

    private static bool TryGetCampaignAssetPath(string url, out string assetPath)
    {
        assetPath = string.Empty;

        if (url.StartsWith(CampaignAssetPathPrefix, StringComparison.OrdinalIgnoreCase))
        {
            assetPath = NormalizeAssetPath(url);
            return true;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var path = uri.AbsolutePath;
        var index = path.IndexOf(CampaignAssetPathPrefix, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return false;
        }

        assetPath = NormalizeAssetPath(path[index..]);
        return true;
    }

    private static string NormalizeAssetPath(string path)
    {
        // Keep GUID casing stable for cache keys / comparisons.
        var prefixLength = CampaignAssetPathPrefix.Length;
        if (path.Length <= prefixLength)
        {
            return CampaignAssetPathPrefix.TrimEnd('/');
        }

        var idPart = path[prefixLength..].Trim('/');
        return $"{CampaignAssetPathPrefix}{idPart}";
    }
}
