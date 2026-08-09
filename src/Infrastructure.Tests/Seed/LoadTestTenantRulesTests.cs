using Cohestra.Infrastructure.Seed;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class LoadTestTenantRulesTests
{
    [Theory]
    [InlineData("load-core-alpha", true, true)]
    [InlineData("load-pro-beta", false, true)]
    [InlineData("acme-corp", true, false)]
    [InlineData("load-core-alpha", false, true)]
    public void UnlocksWebsiteBuilder_matches_load_test_workspaces(
        string slug,
        bool isComplimentary,
        bool expected)
    {
        Assert.Equal(expected, LoadTestTenantRules.UnlocksWebsiteBuilder(slug, isComplimentary));
    }
}
