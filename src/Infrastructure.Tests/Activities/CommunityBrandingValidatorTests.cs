using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class CommunityBrandingValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ValidateLogoAssetId_AllowsEmpty(string? value)
    {
        Assert.Null(CommunityBrandingValidator.ValidateLogoAssetId(value));
    }

    [Fact]
    public void ValidateLogoAssetId_RejectsInvalidGuid()
    {
        var error = CommunityBrandingValidator.ValidateLogoAssetId("not-a-guid");
        Assert.NotNull(error);
        Assert.Contains("GUID", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateLogoAssetId_AcceptsValidGuid()
    {
        var id = Guid.NewGuid().ToString();
        Assert.Null(CommunityBrandingValidator.ValidateLogoAssetId(id));
    }

    [Fact]
    public void ValidateBrandKit_RejectsInvalidAccent()
    {
        var error = CommunityBrandingValidator.ValidateBrandKit(null, "red", null);
        Assert.NotNull(error);
        Assert.Contains("hex", error, StringComparison.OrdinalIgnoreCase);
    }
}
