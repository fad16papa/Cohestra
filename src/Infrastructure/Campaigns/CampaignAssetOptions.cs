namespace Cohestra.Infrastructure.Campaigns;

public sealed class CampaignAssetOptions
{
    public const string SectionName = "CampaignAssets";

    public string StoragePath { get; set; } = "data/campaign-assets";

    /// <summary>Public API base URL used in email image src attributes.</summary>
    public string PublicApiBaseUrl { get; set; } = "http://localhost:8080";
}
