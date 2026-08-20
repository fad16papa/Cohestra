using System.Text.RegularExpressions;
using Cohestra.Infrastructure.Support;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueNumberGeneratorTests
{
    private static readonly Regex IssueNumberPattern = new(
        @"^SUP\d{8}\d{6}$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    [Fact]
    public void Format_UsesSupPrefixDateAndSixDigitSuffix()
    {
        var timestamp = new DateTimeOffset(2026, 8, 16, 12, 0, 0, TimeSpan.Zero);

        Assert.Equal("SUP20260816000042", SupportIssueNumberGenerator.Format(timestamp, 42));
        Assert.Equal("SUP20260816000000", SupportIssueNumberGenerator.Format(timestamp, 0));
        Assert.Equal("SUP20260816999999", SupportIssueNumberGenerator.Format(timestamp, 999_999));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1_000_000)]
    public void Format_RejectsOutOfRangeSuffix(int suffix)
    {
        var timestamp = new DateTimeOffset(2026, 8, 16, 12, 0, 0, TimeSpan.Zero);

        Assert.Throws<ArgumentOutOfRangeException>(() => SupportIssueNumberGenerator.Format(timestamp, suffix));
    }

    [Fact]
    public async Task GenerateNextAsync_UsesUtcDateAndRandomSixDigitSuffix()
    {
        var generator = new SupportIssueNumberGenerator();
        var timestamp = new DateTimeOffset(2026, 8, 17, 8, 0, 0, TimeSpan.Zero);

        var issueNumber = await generator.GenerateNextAsync(timestamp);

        Assert.Matches(IssueNumberPattern, issueNumber);
        Assert.StartsWith("SUP20260817", issueNumber, StringComparison.Ordinal);
        Assert.Equal(17, issueNumber.Length);
    }
}
