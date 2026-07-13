using LeadGenerationCrm.Infrastructure.Activities;

namespace LeadGenerationCrm.Infrastructure.Tests.Activities;

public sealed class ActivityHeroImageUrlResolverTests
{
    private const string PublicBase = "https://uat.creativorare.com";

    [Fact]
    public void Resolve_ReturnsNullForEmpty()
    {
        Assert.Null(ActivityHeroImageUrlResolver.Resolve(null, PublicBase));
        Assert.Null(ActivityHeroImageUrlResolver.Resolve("   ", PublicBase));
    }

    [Fact]
    public void Resolve_PassesThroughExternalUrls()
    {
        const string external = "https://cdn.example.com/hero.jpg";

        Assert.Equal(external, ActivityHeroImageUrlResolver.Resolve(external, PublicBase));
    }

    [Fact]
    public void Resolve_RewritesLocalhostCampaignAssetUrls()
    {
        const string stored =
            "http://localhost:8080/api/v1/public/campaign-assets/11111111-1111-1111-1111-111111111111";

        var resolved = ActivityHeroImageUrlResolver.Resolve(stored, PublicBase);

        Assert.Equal(
            $"{PublicBase}/api/v1/public/campaign-assets/11111111-1111-1111-1111-111111111111",
            resolved);
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
}
