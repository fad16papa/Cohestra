using Cohestra.Infrastructure.Signup;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Signup;

public sealed class GoogleRecaptchaVerifierTests
{
    [Fact]
    public async Task Production_disabled_recaptcha_accepts_empty_token_without_bypass()
    {
        var verifier = Create("Production", enabled: false, bypass: "");
        var (valid, error) = await verifier.VerifyAsync(null, "127.0.0.1");
        Assert.True(valid);
        Assert.Null(error);
    }

    [Fact]
    public async Task Production_disabled_recaptcha_does_not_require_well_known_test_token()
    {
        var verifier = Create("Production", enabled: false, bypass: "");
        var (valid, _) = await verifier.VerifyAsync("test-captcha-pass", "127.0.0.1");
        Assert.True(valid);
    }

    [Fact]
    public async Task Production_disabled_accepts_empty_even_if_bypass_config_was_left_behind()
    {
        var verifier = Create("Production", enabled: false, bypass: "test-captcha-pass");
        var (valid, error) = await verifier.VerifyAsync(null, "127.0.0.1");
        Assert.True(valid);
        Assert.Null(error);
    }

    [Fact]
    public async Task Testing_disabled_recaptcha_rejects_missing_token()
    {
        var verifier = Create("Testing", enabled: false, bypass: "test-captcha-pass");
        var (valid, error) = await verifier.VerifyAsync(null, "127.0.0.1");
        Assert.False(valid);
        Assert.Contains("CAPTCHA", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Testing_disabled_recaptcha_accepts_configured_bypass()
    {
        var verifier = Create("Testing", enabled: false, bypass: "test-captcha-pass");
        var (valid, error) = await verifier.VerifyAsync("test-captcha-pass", "127.0.0.1");
        Assert.True(valid);
        Assert.Null(error);
    }

    [Fact]
    public void Recaptcha_settings_default_bypass_is_empty()
    {
        Assert.Equal(string.Empty, new RecaptchaSettings().TestBypassToken);
    }

    [Fact]
    public async Task Empty_bypass_token_does_not_match_empty_captcha_when_enabled_without_secret()
    {
        var verifier = Create("Production", enabled: true, bypass: "");
        var (valid, error) = await verifier.VerifyAsync("", "127.0.0.1");
        Assert.False(valid);
        Assert.Contains("unavailable", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Production_never_honors_test_bypass_when_recaptcha_is_enabled()
    {
        var verifier = Create("Production", enabled: true, bypass: "test-captcha-pass");
        var (valid, error) = await verifier.VerifyAsync("test-captcha-pass", "127.0.0.1");
        Assert.False(valid);
        Assert.Contains("unavailable", error, StringComparison.OrdinalIgnoreCase);
    }

    private static GoogleRecaptchaVerifier Create(string environmentName, bool enabled, string bypass)
    {
        var settings = new SelfServeSignupSettings
        {
            Recaptcha = new RecaptchaSettings
            {
                Enabled = enabled,
                SecretKey = "",
                TestBypassToken = bypass,
            },
        };

        return new GoogleRecaptchaVerifier(
            new UnusedHttpFactory(),
            new StubHostEnvironment(environmentName),
            Options.Create(settings),
            NullLogger<GoogleRecaptchaVerifier>.Instance);
    }

    private sealed class UnusedHttpFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) =>
            throw new InvalidOperationException("HTTP client must not be used in these cases.");
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "Cohestra.Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
