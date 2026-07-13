using Cohestra.Infrastructure.Campaigns;

namespace Cohestra.Infrastructure.Tests.Campaigns;

public sealed class CampaignEmailBodyProcessorTests
{
    [Fact]
    public void Process_HtmlBody_ProducesPlainTextFallback()
    {
        var processed = CampaignEmailBodyProcessor.Process(
            "<p>Hello <strong>team</strong></p>",
            "html");

        Assert.Equal(Domain.Campaigns.CampaignBodyFormat.Html, processed.BodyFormat);
        Assert.NotNull(processed.HtmlBody);
        Assert.Contains("Hello", processed.PlainTextBody);
        Assert.Contains("team", processed.PlainTextBody);
    }

    [Fact]
    public void ValidateImageSources_RejectsExternalImages()
    {
        var html = "<p>Hi</p><img src=\"https://example.com/image.png\" alt=\"x\" />";

        var ex = Assert.Throws<ArgumentException>(() =>
            CampaignEmailBodyProcessor.ValidateImageSources(html));

        Assert.Contains("uploaded through the campaign composer", ex.Message);
    }

    [Fact]
    public void ValidateImageSources_AllowsCampaignAssetImages()
    {
        var html =
            "<img src=\"http://localhost:8080/api/v1/public/campaign-assets/11111111-1111-1111-1111-111111111111\" alt=\"QR\" />";

        CampaignEmailBodyProcessor.ValidateImageSources(html);
    }
}
