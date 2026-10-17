using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class PlatformAdminSeedOneShotTests
{
    [Fact]
    public void IsRequested_is_false_by_default()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection().Build();
        Assert.False(PlatformAdminSeedOneShot.IsRequested(configuration));
    }

    [Fact]
    public void EnsureAllowed_noops_when_one_shot_is_not_requested()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PlatformAdminSeed:Enabled"] = "true",
                ["PublicWeb:BaseUrl"] = "https://cohestra.app",
            })
            .Build();

        var exception = Record.Exception(() => PlatformAdminSeedOneShot.EnsureAllowed(configuration));
        Assert.Null(exception);
    }

    [Fact]
    public void EnsureAllowed_refuses_when_seed_is_disabled()
    {
        var configuration = Config(enabled: false, publicBaseUrl: "https://uat.cohestra.app", oneShot: true);

        var exception = Assert.Throws<InvalidOperationException>(
            () => PlatformAdminSeedOneShot.EnsureAllowed(configuration));

        Assert.Contains("Enabled must be true", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("https://cohestra.app")]
    [InlineData("https://www.cohestra.app")]
    [InlineData("https://picklemania.cohestra.app")]
    [InlineData("https://creativorare.uat.example.com")]
    [InlineData("not-a-url")]
    [InlineData("")]
    public void EnsureAllowed_refuses_non_uat_public_base(string publicBaseUrl)
    {
        var configuration = Config(enabled: true, publicBaseUrl: publicBaseUrl, oneShot: true);

        var exception = Assert.Throws<InvalidOperationException>(
            () => PlatformAdminSeedOneShot.EnsureAllowed(configuration));

        Assert.Contains("not a UAT host", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("https://uat.cohestra.app")]
    [InlineData("http://uat.cohestra.app")]
    [InlineData("https://www.uat.cohestra.app/")]
    public void EnsureAllowed_accepts_uat_public_base_when_enabled(string publicBaseUrl)
    {
        var configuration = Config(enabled: true, publicBaseUrl: publicBaseUrl, oneShot: true);

        var exception = Record.Exception(() => PlatformAdminSeedOneShot.EnsureAllowed(configuration));
        Assert.Null(exception);
        Assert.True(PlatformAdminSeedOneShot.IsUatPublicBase(publicBaseUrl));
    }

    private static IConfiguration Config(bool enabled, string publicBaseUrl, bool oneShot) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PLATFORM_ADMIN_SEED_ONESHOT"] = oneShot ? "true" : "false",
                ["PlatformAdminSeed:Enabled"] = enabled ? "true" : "false",
                ["PublicWeb:BaseUrl"] = publicBaseUrl,
            })
            .Build();
}
