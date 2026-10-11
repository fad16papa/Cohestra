using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class BillingReturnUrlTests
{
    private const string UatPublicBase = "https://uat.cohestra.app";
    private const string Slug = "creativorare";
    private const string UatOrigin = "https://creativorare.uat.cohestra.app";

    [Fact]
    public void TenantOrigin_uat_is_https_slug_host()
    {
        Assert.Equal(UatOrigin, BillingReturnUrl.TenantOrigin(UatPublicBase, Slug));
    }

    [Fact]
    public void IsAllowed_valid_tenant_https_return_url()
    {
        Assert.True(BillingReturnUrl.IsAllowed(
            $"{UatOrigin}/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_wrong_scheme_http_on_https_workspace()
    {
        Assert.False(BillingReturnUrl.IsAllowed(
            "http://creativorare.uat.cohestra.app/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_wrong_tenant_host()
    {
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://harbourline.uat.cohestra.app/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_external_hostname()
    {
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://evil.example/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_deceptive_suffix()
    {
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://creativorare.uat.cohestra.app.evil.example/settings/billing",
            UatPublicBase,
            Slug));
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://notcreativorare.uat.cohestra.app/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("/settings/billing")]
    [InlineData("not-a-url")]
    [InlineData("javascript:alert(1)")]
    [InlineData("ftp://creativorare.uat.cohestra.app/settings/billing")]
    [InlineData("https://attacker@creativorare.uat.cohestra.app/settings/billing")]
    public void IsAllowed_invalid_url(string? candidate)
    {
        Assert.False(BillingReturnUrl.IsAllowed(candidate, UatPublicBase, Slug));
    }

    [Fact]
    public void IsAllowed_ignores_request_scheme_and_forwarded_host()
    {
        // API Request.Scheme is http and a client can send X-Forwarded-Host=evil.
        // Allow-list is PublicWeb + authenticated slug only.
        Assert.True(BillingReturnUrl.IsAllowed(
            $"{UatOrigin}/settings/billing",
            UatPublicBase,
            Slug));
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://evil.example/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_wildcard_cohestra_app_is_rejected()
    {
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://other.cohestra.app/settings/billing",
            "https://cohestra.app",
            Slug));
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://creativorare.cohestra.app/settings/billing",
            UatPublicBase,
            Slug));
    }

    [Fact]
    public void IsAllowed_verified_custom_domain_uses_public_scheme()
    {
        Assert.True(BillingReturnUrl.IsAllowed(
            "https://events.acme.example/settings/billing",
            UatPublicBase,
            Slug,
            "events.acme.example"));
        Assert.False(BillingReturnUrl.IsAllowed(
            "http://events.acme.example/settings/billing",
            UatPublicBase,
            Slug,
            "events.acme.example"));
    }

    [Fact]
    public void VerifiedCustomDomain_requires_verification_timestamp()
    {
        Assert.Null(BillingReturnUrl.VerifiedCustomDomain("events.acme.example", verifiedAt: null));
        Assert.Equal(
            "events.acme.example",
            BillingReturnUrl.VerifiedCustomDomain("events.acme.example", DateTimeOffset.UtcNow));
    }

    [Fact]
    public void VerifiedCustomDomain_rejects_embedded_path_or_userinfo()
    {
        Assert.Null(BillingReturnUrl.VerifiedCustomDomain(
            "https://events.acme.example",
            DateTimeOffset.UtcNow));
        Assert.Null(BillingReturnUrl.VerifiedCustomDomain(
            "events.acme.example/phish",
            DateTimeOffset.UtcNow));
        Assert.Null(BillingReturnUrl.VerifiedCustomDomain(
            "user@events.acme.example",
            DateTimeOffset.UtcNow));
    }

    [Fact]
    public void IsAllowed_localhost_http_matches_public_web_portless_host()
    {
        Assert.True(BillingReturnUrl.IsAllowed(
            "http://studio.localhost/settings/billing",
            "http://localhost:3000",
            "studio"));
        Assert.False(BillingReturnUrl.IsAllowed(
            "https://studio.localhost/settings/billing",
            "http://localhost:3000",
            "studio"));
    }

    [Fact]
    public void TenantPath_default_portal_and_checkout_urls()
    {
        Assert.Equal(
            $"{UatOrigin}/settings/billing",
            BillingReturnUrl.TenantPath(UatPublicBase, Slug, "/settings/billing"));
        Assert.Equal(
            $"{UatOrigin}/dashboard?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
            BillingReturnUrl.TenantPath(
                UatPublicBase,
                Slug,
                "/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}"));
        Assert.Equal(
            $"{UatOrigin}/billing/checkout?canceled=1",
            BillingReturnUrl.TenantPath(UatPublicBase, Slug, "/billing/checkout?canceled=1"));
    }
}
