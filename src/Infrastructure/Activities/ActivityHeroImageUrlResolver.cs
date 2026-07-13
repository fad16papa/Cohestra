namespace LeadGenerationCrm.Infrastructure.Activities;

internal static class ActivityHeroImageUrlResolver
{
    internal const string CampaignAssetPathPrefix = "/api/v1/public/campaign-assets/";

    public static string? Resolve(string? heroImageUrl, string publicApiBaseUrl)
    {
        var normalized = ActivityBrandingValidator.NormalizeHeroImageUrl(heroImageUrl);
        if (normalized is null)
        {
            return null;
        }

        var baseUrl = publicApiBaseUrl.Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return normalized;
        }

        if (TryGetCampaignAssetPath(normalized, out var assetPath))
        {
            return $"{baseUrl}{assetPath}";
        }

        return normalized;
    }

    private static bool TryGetCampaignAssetPath(string url, out string assetPath)
    {
        assetPath = string.Empty;

        if (url.StartsWith(CampaignAssetPathPrefix, StringComparison.OrdinalIgnoreCase))
        {
            assetPath = url;
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

        assetPath = path[index..];
        return true;
    }
}
