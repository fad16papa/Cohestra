using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityBrandingContrastValidatorTests
{
    [Fact]
    public void ValidateAccentContrastForWhiteText_AcceptsAccessibleAccent()
    {
        Assert.Null(ActivityBrandingContrastValidator.ValidateAccentContrastForWhiteText("#2d6a4f"));
    }

    [Fact]
    public void ValidateAccentContrastForWhiteText_RejectsLowContrastAccent()
    {
        var error = ActivityBrandingContrastValidator.ValidateAccentContrastForWhiteText("#ffffcc");

        Assert.NotNull(error);
        Assert.Contains("contrast", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAccentContrastForWhiteText_AllowsNullAccent()
    {
        Assert.Null(ActivityBrandingContrastValidator.ValidateAccentContrastForWhiteText(null));
    }
}
