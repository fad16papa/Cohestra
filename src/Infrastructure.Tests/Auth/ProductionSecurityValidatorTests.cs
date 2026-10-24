using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class ProductionSecurityValidatorTests
{
    [Fact]
    public void Validate_allows_development_placeholder_secrets()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "DEV_ONLY_CHANGE_IN_PRODUCTION_use_at_least_32_chars",
                ["OperatorSeed:Enabled"] = "true",
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=localhost;Port=5432;Database=cohestra;Username=crm;Password=crm",
            })
            .Build();

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Development)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_development_jwt_signing_key_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "DEV_ONLY_CHANGE_IN_PRODUCTION_use_at_least_32_chars",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Jwt:SigningKey", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_operator_seed_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["OperatorSeed:Enabled"] = "true",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("OperatorSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_load_test_seed_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["LoadTestSeed:Enabled"] = "true",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("LoadTestSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_demo_data_seed_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["DemoDataSeed:Enabled"] = "true",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("DemoDataSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_dev_db_credentials_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["Cors:AllowedOrigins:0"] = "https://cohestra.app",
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=localhost;Port=5432;Database=cohestra;Username=crm;Password=crm",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("DefaultConnection", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_isolated_compose_postgres_role_crm_with_non_dev_password()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length");

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_padded_password_crm_on_isolated_compose_host()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password= crm ");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("password", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejects_password_crm_even_on_isolated_compose_host()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=crm");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("password", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejects_username_crm_on_loopback_even_with_strong_password()
    {
        var configuration = ProductionConfig(
            "Host=127.0.0.1;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("localhost", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejects_username_crm_on_non_compose_host()
    {
        var configuration = ProductionConfig(
            "Host=shared-db.example;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("isolated Compose", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_live_paddle_keys_in_development()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "DEV_ONLY_CHANGE_IN_PRODUCTION_use_at_least_32_chars",
                ["Paddle:Environment"] = "sandbox",
                ["Paddle:ApiKey"] = "pdl_live_apikey",
                ["Paddle:ClientToken"] = "live_client",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Development)));

        Assert.Contains("Live Paddle", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_uat_production_host_with_sandbox_paddle()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
            paddleEnvironment: "sandbox",
            paddleApiKey: "pdl_sdbx_apikey",
            paddleClientToken: "test_client",
            publicBaseUrl: "http://uat.cohestra.app");

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_sandbox_paddle_keys_when_environment_is_production()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
            paddleEnvironment: "production",
            paddleApiKey: "pdl_sdbx_apikey",
            paddleClientToken: "test_client",
            paddleAllowLive: true);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Sandbox Paddle credentials", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_production_paddle_environment_without_allow_live()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
            paddleEnvironment: "production",
            paddleApiKey: "pdl_live_apikey",
            paddleClientToken: "live_client");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Paddle:AllowLive=true", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_live_paddle_on_uat_public_host_even_with_allow_live()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
            paddleEnvironment: "production",
            paddleApiKey: "pdl_live_apikey",
            paddleClientToken: "live_client",
            paddleAllowLive: true,
            publicBaseUrl: "https://uat.cohestra.app");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("UAT public host", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_sandbox_uat_when_allow_live_is_accidentally_true()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
            paddleEnvironment: "sandbox",
            paddleApiKey: "pdl_sdbx_apikey",
            paddleClientToken: "test_client",
            paddleAllowLive: true,
            publicBaseUrl: "http://uat.cohestra.app");

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_platform_admin_seed_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["PlatformAdminSeed:Enabled"] = "true",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("PlatformAdminSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_localhost_cors_in_production()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000",
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("localhost", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejects_recaptcha_bypass_token_in_production()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["SelfServeSignup:Recaptcha:TestBypassToken"] = "test-captcha-pass",
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("TestBypassToken", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_google_recaptcha_test_secret_in_production()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["SelfServeSignup:Recaptcha:Enabled"] = "true",
                ["SelfServeSignup:Recaptcha:SecretKey"] = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Google test keys", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_open_signup_without_recaptcha_on_production_apex()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["PublicWeb:BaseUrl"] = "https://cohestra.app",
                ["SelfServeSignup:RegistrationClosed"] = "false",
                ["SelfServeSignup:Recaptcha:Enabled"] = "false",
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Recaptcha:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_open_signup_on_production_apex_when_recaptcha_is_enabled()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["PublicWeb:BaseUrl"] = "https://cohestra.app",
                ["SelfServeSignup:RegistrationClosed"] = "false",
                ["SelfServeSignup:Recaptcha:Enabled"] = "true",
                ["SelfServeSignup:Recaptcha:SecretKey"] = "production-recaptcha-secret-not-a-google-test-key",
            });

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_rejects_passwordless_redis_on_non_uat_production_host()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length"),
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:Redis"] = "redis:6379",
                ["PublicWeb:BaseUrl"] = "https://cohestra.app",
                ["SelfServeSignup:RegistrationClosed"] = "true",
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Redis", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_allows_passwordless_redis_on_uat_public_host()
    {
        var configuration = RebuildWith(
            ProductionConfig(
                "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=production-secret-key-with-sufficient-length",
                publicBaseUrl: "https://uat.cohestra.app"),
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:Redis"] = "redis:6379",
            });

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    private static IConfiguration RebuildWith(IConfiguration source, Dictionary<string, string?> extras)
    {
        var values = new Dictionary<string, string?>();
        foreach (var child in source.AsEnumerable())
        {
            values[child.Key] = child.Value;
        }

        foreach (var extra in extras)
        {
            values[extra.Key] = extra.Value;
        }

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private static IConfiguration ProductionConfig(
        string connectionString,
        string? paddleEnvironment = null,
        string? paddleApiKey = null,
        string? paddleClientToken = null,
        bool? paddleAllowLive = null,
        string? publicBaseUrl = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
            ["Cors:AllowedOrigins:0"] = "https://cohestra.app",
            ["SelfServeSignup:RegistrationClosed"] = "true",
            ["ConnectionStrings:DefaultConnection"] = connectionString,
        };
        if (publicBaseUrl is not null)
        {
            values["PublicWeb:BaseUrl"] = publicBaseUrl;
        }
        if (paddleEnvironment is not null)
        {
            values["Paddle:Environment"] = paddleEnvironment;
        }

        if (paddleApiKey is not null)
        {
            values["Paddle:ApiKey"] = paddleApiKey;
        }

        if (paddleClientToken is not null)
        {
            values["Paddle:ClientToken"] = paddleClientToken;
        }

        if (paddleAllowLive is not null)
        {
            values["Paddle:AllowLive"] = paddleAllowLive.Value ? "true" : "false";
        }

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = "/tmp";

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
