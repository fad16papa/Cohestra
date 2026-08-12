namespace Cohestra.Infrastructure.Activities;

internal static class CommunityBrandingValidator
{
    public static string? ValidateLogoAssetId(string? logoAssetId)
    {
        if (string.IsNullOrWhiteSpace(logoAssetId))
        {
            return null;
        }

        var trimmed = logoAssetId.Trim();
        if (trimmed.Length > 36)
        {
            return "Logo asset id must be 36 characters or fewer.";
        }

        if (!Guid.TryParse(trimmed, out _))
        {
            return "Logo asset id must be a valid GUID.";
        }

        return null;
    }

    public static string? NormalizeLogoAssetId(string? logoAssetId)
    {
        if (string.IsNullOrWhiteSpace(logoAssetId))
        {
            return null;
        }

        return logoAssetId.Trim();
    }

    public static (string? LogoAssetId, string? AccentColor, string? DefaultHeroImageUrl) NormalizeBrandKit(
        string? logoAssetId,
        string? accentColor,
        string? defaultHeroImageUrl)
    {
        return (
            NormalizeLogoAssetId(logoAssetId),
            ActivityBrandingValidator.NormalizeAccentColor(accentColor),
            ActivityBrandingValidator.NormalizeHeroImageUrl(defaultHeroImageUrl));
    }

    public static string? ValidateBrandKit(
        string? logoAssetId,
        string? accentColor,
        string? defaultHeroImageUrl)
    {
        return ValidateLogoAssetId(logoAssetId)
            ?? ActivityBrandingValidator.ValidateAccentColor(accentColor)
            ?? ActivityBrandingValidator.ValidateHeroImageUrl(defaultHeroImageUrl);
    }
}
