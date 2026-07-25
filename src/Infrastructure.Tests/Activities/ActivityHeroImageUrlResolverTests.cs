using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityHeroImageUrlResolverTests
{
    private const string PublicBase = "https://uat.creativorare.com";
    private const string AssetId = "11111111-1111-1111-1111-111111111111";

    [Fact]
    public void Resolve_ReturnsNullForEmpty()
    {
        Assert.Null(ActivityHeroImageUrlResolver.Resolve(null, PublicBase));
        Assert.Null(ActivityHeroImageUrlResolver.Resolve("   ", PublicBase));
        Assert.Null(ActivityHeroImageUrlResolver.ResolveForBrowser(null));
    }

    [Fact]
    public void Resolve_PassesThroughExternalUrls()
    {
        const string external = "https://cdn.example.com/hero.jpg";

        Assert.Equal(external, ActivityHeroImageUrlResolver.Resolve(external, PublicBase));
        Assert.Equal(external, ActivityHeroImageUrlResolver.ResolveForBrowser(external));
    }

    [Fact]
    public void Resolve_RewritesLocalhostCampaignAssetUrlsToAbsolute()
    {
        var stored =
            $"http://localhost:8080/api/v1/public/campaign-assets/{AssetId}";

        var resolved = ActivityHeroImageUrlResolver.Resolve(stored, PublicBase);

        Assert.Equal(
            $"{PublicBase}/api/v1/public/campaign-assets/{AssetId}",
            resolved);
    }

    [Fact]
    public void ResolveForBrowser_ReturnsRelativeCampaignAssetPath()
    {
        var stored =
            $"http://localhost:8088/api/v1/public/campaign-assets/{AssetId}";

        var resolved = ActivityHeroImageUrlResolver.ResolveForBrowser(stored);

        Assert.Equal($"/api/v1/public/campaign-assets/{AssetId}", resolved);
    }

    [Fact]
    public void ResolveForBrowser_KeepsRelativeCampaignAssetPath()
    {
        var stored = $"/api/v1/public/campaign-assets/{AssetId}";

        var resolved = ActivityHeroImageUrlResolver.ResolveForBrowser(stored);

        Assert.Equal(stored, resolved);
    }

    [Fact]
    public void Resolve_RewritesRelativeCampaignAssetPaths()
    {
        const string stored =
            "/api/v1/public/campaign-assets/22222222-2222-2222-2222-222222222222";

        var resolved = ActivityHeroImageUrlResolver.Resolve(stored, PublicBase);

        Assert.Equal(
            $"{PublicBase}/api/v1/public/campaign-assets/22222222-2222-2222-2222-222222222222",
            resolved);
    }

    [Fact]
    public void ResolveForEmail_BuildsTenantHostCampaignAssetUrl()
    {
        var stored = $"/api/v1/public/campaign-assets/{AssetId}";

        var resolved = ActivityHeroImageUrlResolver.ResolveForEmail(
            stored,
            "http://localhost:8088",
            "creativorare");

        Assert.Equal(
            $"http://creativorare.localhost:8088/api/v1/public/campaign-assets/{AssetId}",
            resolved);
    }

    [Fact]
    public void ResolveForEmail_PassesThroughExternalUrls()
    {
        const string external = "https://cdn.example.com/hero.jpg";

        var resolved = ActivityHeroImageUrlResolver.ResolveForEmail(
            external,
            "http://localhost:8088",
            "creativorare");

        Assert.Equal(external, resolved);
    }

    [Fact]
    public void TryGetCampaignAssetId_ParsesRelativeCampaignAssetPath()
    {
        var stored = $"/api/v1/public/campaign-assets/{AssetId}";

        var parsed = ActivityHeroImageUrlResolver.TryGetCampaignAssetId(
            stored,
            out var assetId);

        Assert.True(parsed);
        Assert.Equal(Guid.Parse(AssetId), assetId);
    }
}
