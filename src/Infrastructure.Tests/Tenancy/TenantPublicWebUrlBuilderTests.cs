using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantPublicWebUrlBuilderTests
{
    [Fact]
    public void BuildTenantPath_localhostWithPort_includesPortOnTenantHost()
    {
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            "http://localhost:8088",
            "creativorare",
            "/invite/accept");

        Assert.Equal("http://creativorare.localhost:8088/invite/accept", url);
    }

    [Fact]
    public void BuildTenantPath_productionApex_usesCohestraSubdomain()
    {
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            "https://cohestra.app",
            "acme",
            "/invite/accept");

        Assert.Equal("https://acme.cohestra.app/invite/accept", url);
    }

    [Fact]
    public void BuildTenantPath_nipIoApex_buildsTenantSubdomain()
    {
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            "https://129-212-235-2.nip.io",
            "acme",
            "/invite/accept");

        Assert.Equal("https://acme.129-212-235-2.nip.io/invite/accept", url);
    }
}
