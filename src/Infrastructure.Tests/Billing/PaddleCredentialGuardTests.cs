using Cohestra.Infrastructure.Billing;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleCredentialGuardTests
{
    [Fact]
    public void Validate_skips_when_no_paddle_credentials()
    {
        var exception = Record.Exception(() =>
            PaddleCredentialGuard.Validate(new PaddleSettings(), Host(Environments.Development)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_allows_sandbox_keys_in_development()
    {
        var exception = Record.Exception(() =>
            PaddleCredentialGuard.Validate(SandboxSettings(), Host(Environments.Development)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_live_keys_when_environment_is_sandbox()
    {
        var settings = new PaddleSettings
        {
            Environment = "sandbox",
            ApiKey = "pdl_live_apikey",
            ClientToken = "live_client",
            WebhookSecret = "pdl_ntfset_live",
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            PaddleCredentialGuard.Validate(settings, Host(Environments.Production)));

        Assert.Contains("Live Paddle credentials", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_production_paddle_without_allow_live()
    {
        var settings = new PaddleSettings
        {
            Environment = "production",
            ApiKey = "pdl_live_apikey",
            ClientToken = "live_client",
            AllowLive = false,
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            PaddleCredentialGuard.Validate(settings, Host(Environments.Production)));

        Assert.Contains("Paddle:AllowLive=true", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_sandbox_keys_when_environment_is_production()
    {
        var settings = SandboxSettings();
        settings.Environment = "production";
        settings.AllowLive = true;

        var exception = Assert.Throws<InvalidOperationException>(() =>
            PaddleCredentialGuard.Validate(settings, Host(Environments.Production)));

        Assert.Contains("Sandbox Paddle credentials", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_live_paddle_in_testing_host()
    {
        var settings = new PaddleSettings
        {
            Environment = "production",
            ApiKey = "pdl_live_apikey",
            ClientToken = "live_client",
            AllowLive = true,
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            PaddleCredentialGuard.Validate(settings, Host("Testing")));

        Assert.Contains("Live Paddle is not allowed", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_production_host_with_live_keys()
    {
        var settings = new PaddleSettings
        {
            Environment = "production",
            ApiKey = "pdl_live_apikey",
            ClientToken = "live_client",
            WebhookSecret = "pdl_ntfset_live",
            AllowLive = true,
        };

        var exception = Record.Exception(() =>
            PaddleCredentialGuard.Validate(settings, Host(Environments.Production)));

        Assert.Null(exception);
    }

    private static PaddleSettings SandboxSettings() =>
        new()
        {
            Environment = "sandbox",
            ApiKey = "pdl_sdbx_apikey",
            ClientToken = "test_client",
            WebhookSecret = "pdl_ntfset_sdbx",
        };

    private static StubHostEnvironment Host(string name) => new(name);

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = "/tmp";

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
