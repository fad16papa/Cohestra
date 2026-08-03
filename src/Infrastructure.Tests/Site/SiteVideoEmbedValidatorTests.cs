using Cohestra.Infrastructure.Site;

namespace Cohestra.Infrastructure.Tests.Site;

public sealed class SiteVideoEmbedValidatorTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/embed/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ")]
    [InlineData("https://vimeo.com/123456789", "vimeo", "123456789")]
    [InlineData("https://player.vimeo.com/video/123456789", "vimeo", "123456789")]
    public void TryParse_accepts_supported_hosts(string url, string source, string videoId)
    {
        var ok = SiteVideoEmbedValidator.TryParse(url, out var info, out var error);

        Assert.True(ok);
        Assert.Null(error);
        Assert.NotNull(info);
        Assert.Equal(source, info.Source);
        Assert.Equal(videoId, info.VideoId);
        Assert.Contains(videoId, info.EmbedUrl, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("http://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://tiktok.com/@user/video/1")]
    [InlineData("https://example.com/video")]
    [InlineData("not-a-url")]
    public void TryParse_rejects_unsupported_or_insecure_urls(string url)
    {
        var ok = SiteVideoEmbedValidator.TryParse(url, out _, out var error);

        Assert.False(ok);
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void IsAllowedForPlan_blocks_video_on_core()
    {
        Assert.False(SiteSectionPlanGate.IsAllowedForPlan("video", Domain.Tenants.TenantPlan.Core));
        Assert.True(SiteSectionPlanGate.IsAllowedForPlan("video", Domain.Tenants.TenantPlan.Pro));
    }
}
