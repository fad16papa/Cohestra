using Cohestra.Infrastructure.Auth;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class ProductionCorsOriginsTests
{
    [Theory]
    [InlineData("https://cohestra.app")]
    [InlineData("https://www.cohestra.app")]
    [InlineData("https://harbourline.cohestra.app")]
    [InlineData("https://picklemania.cohestra.app")]
    public void IsAllowed_accepts_production_https_origins(string origin)
    {
        Assert.True(ProductionCorsOrigins.IsAllowed(origin));
    }

    [Theory]
    [InlineData("http://cohestra.app")]
    [InlineData("http://localhost:3000")]
    [InlineData("https://localhost")]
    [InlineData("https://127.0.0.1")]
    [InlineData("https://uat.cohestra.app")]
    [InlineData("https://demo.uat.cohestra.app")]
    [InlineData("https://cohestra.app/admin")]
    [InlineData("https://user:pass@cohestra.app")]
    [InlineData("https://evil.cohestra.app.example")]
    [InlineData("https://not-cohestra.app")]
    [InlineData("")]
    [InlineData(null)]
    public void IsAllowed_rejects_non_production_origins(string? origin)
    {
        Assert.False(ProductionCorsOrigins.IsAllowed(origin));
    }

    [Theory]
    [InlineData("https://cohestra.app")]
    [InlineData("https://cohestra.app/")]
    [InlineData("https://harbourline.cohestra.app/billing")]
    public void IsProductionPublicBaseUrl_accepts_https_production_hosts(string url)
    {
        Assert.True(ProductionCorsOrigins.IsProductionPublicBaseUrl(url));
    }

    [Theory]
    [InlineData("http://cohestra.app")]
    [InlineData("https://uat.cohestra.app")]
    [InlineData("https://foo.uat.cohestra.app")]
    [InlineData("http://159.223.55.242")]
    public void IsProductionPublicBaseUrl_rejects_uat_http_and_ip(string url)
    {
        Assert.False(ProductionCorsOrigins.IsProductionPublicBaseUrl(url));
    }
}
