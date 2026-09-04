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
    public void BuildTenantPath_localhostRegisterSlug_usesTenantHost()
    {
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            "http://localhost:8088",
            "creativorare",
            "/register/fnm");

        Assert.Equal("http://creativorare.localhost:8088/register/fnm", url);
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

    [Fact]
    public void BuildMarketingApexOrigin_strips_tenant_slug()
    {
        Assert.Equal(
            "http://localhost:8088",
            TenantPublicWebUrlBuilder.BuildMarketingApexOrigin("http://localhost:8088"));
        Assert.Equal(
            "http://localhost:8088",
            TenantPublicWebUrlBuilder.BuildMarketingApexOrigin("http://creativorare.localhost:8088"));
        Assert.Equal(
            "https://cohestra.app",
            TenantPublicWebUrlBuilder.BuildMarketingApexOrigin("https://cohestra.app"));
        Assert.Equal(
            "https://cohestra.app",
            TenantPublicWebUrlBuilder.BuildMarketingApexOrigin("https://creativorare.cohestra.app"));
        Assert.Equal(
            "https://129-212-235-2.nip.io",
            TenantPublicWebUrlBuilder.BuildMarketingApexOrigin("https://acme.129-212-235-2.nip.io"));
    }

    [Fact]
    public void BuildPaddleDefaultPaymentLink_is_apex_without_slug()
    {
        Assert.Equal(
            "http://localhost:8088/billing/paddle-return",
            TenantPublicWebUrlBuilder.BuildPaddleDefaultPaymentLink("http://localhost:8088"));
        Assert.Equal(
            "http://localhost:8088/billing/paddle-return",
            TenantPublicWebUrlBuilder.BuildPaddleDefaultPaymentLink("http://creativorare.localhost:8088"));
        Assert.Equal(
            "https://cohestra.app/billing/paddle-return",
            TenantPublicWebUrlBuilder.BuildPaddleDefaultPaymentLink("https://cohestra.app"));
        Assert.Equal(
            "https://cohestra.app/billing/paddle-return",
            TenantPublicWebUrlBuilder.BuildPaddleDefaultPaymentLink("https://harbourline.cohestra.app"));
    }

    [Fact]
    public void BuildTenantPath_dashboard_success_keeps_query()
    {
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            "http://localhost:8088",
            "creativorare",
            "/dashboard?billing=success&session_id=txn_abc");

        Assert.Equal(
            "http://creativorare.localhost:8088/dashboard?billing=success&session_id=txn_abc",
            url);
    }
}
