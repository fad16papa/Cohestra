using Cohestra.Domain.Support;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueSeverityParserTests
{
    [Theory]
    [InlineData("Unspecified", SupportIssueSeverity.Unspecified)]
    [InlineData("low", SupportIssueSeverity.Low)]
    [InlineData("MEDIUM", SupportIssueSeverity.Medium)]
    [InlineData("High", SupportIssueSeverity.High)]
    [InlineData("Critical", SupportIssueSeverity.Critical)]
    public void TryParse_accepts_current_names(string raw, SupportIssueSeverity expected)
    {
        Assert.True(SupportIssueSeverityParser.TryParse(raw, out var parsed));
        Assert.Equal(expected, parsed);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("2")]
    [InlineData("00")]
    [InlineData("Emergency")]
    [InlineData("Urgent")]
    [InlineData("P0")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void TryParse_rejects_numeric_and_unknown(string? raw)
    {
        Assert.False(SupportIssueSeverityParser.TryParse(raw, out _));
    }

    [Fact]
    public void Vocabulary_is_exactly_five_locked_values()
    {
        Assert.Equal(
            new[]
            {
                SupportIssueSeverity.Unspecified,
                SupportIssueSeverity.Low,
                SupportIssueSeverity.Medium,
                SupportIssueSeverity.High,
                SupportIssueSeverity.Critical,
            },
            Enum.GetValues<SupportIssueSeverity>());
    }
}
