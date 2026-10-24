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
    public void Validate_allows_platform_admin_seed_on_uat_production_environment()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=uat-isolated-secret-with-sufficient-length",
            publicBaseUrl: "https://uat.cohestra.app");
        configuration["PlatformAdminSeed:Enabled"] = "true";

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_platform_admin_seed()
    {
        var configuration = DedicatedProductionConfig(platformAdminSeed: true);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("PlatformAdminSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_short_jwt_signing_key_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "too-short-to-be-a-signing-key",
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("32 characters", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_non_production_environment()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(
                DedicatedProductionConfig(),
                new StubHostEnvironment(Environments.Development)));

        Assert.Contains("ASPNETCORE_ENVIRONMENT=Production", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("synthetic-prod-sendgrid-key", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_dev_tenant_slug()
    {
        var configuration = DedicatedProductionConfig(devTenantSlug: "default");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("DEV_TENANT_SLUG", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("default", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_tenancy_dev_tenant_slug()
    {
        var configuration = DedicatedProductionConfig(tenancyDevTenantSlug: "harbourline");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Tenancy:DevTenantSlug", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("harbourline", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_missing_redis_password()
    {
        var configuration = DedicatedProductionConfig(redis: "redis:6379");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("password", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_placeholder_redis_password()
    {
        var configuration = DedicatedProductionConfig(redis: "redis:6379,password=ci-contract-redis");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("placeholder", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ci-contract-redis", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_loopback_redis()
    {
        var configuration = DedicatedProductionConfig(redis: "127.0.0.1:6379,password=synthetic-redis-password-32chars");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("localhost", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_option_first_loopback_redis()
    {
        var configuration = DedicatedProductionConfig(
            redis: "password=synthetic-redis-password-32chars,127.0.0.1:6379");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("localhost", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_missing_postgres()
    {
        var configuration = DedicatedProductionConfig(postgres: "");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("DefaultConnection", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_tenant_public_base_url()
    {
        var configuration = DedicatedProductionConfig(publicBaseUrl: "https://harbourline.cohestra.app");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("https://cohestra.app", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_truthy_seed_one()
    {
        var configuration = DedicatedProductionConfig(operatorSeed: "1");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("OperatorSeed:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_uat_public_base_url()
    {
        var configuration = DedicatedProductionConfig(publicBaseUrl: "https://uat.cohestra.app");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("UAT", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_http_public_base_url()
    {
        var configuration = DedicatedProductionConfig(publicBaseUrl: "http://cohestra.app");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("https://cohestra.app", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_survives_appsettings_cors_array_merge()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cors:AllowedOrigins:0"] = "http://localhost",
                ["Cors:AllowedOrigins:1"] = "http://localhost:3000",
                ["Cors:AllowedOrigins:2"] = "http://127.0.0.1",
            })
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cohestra:DeploymentPlane"] = "Production",
                ["Jwt:SigningKey"] = "synthetic-production-jwt-signing-key-44chars",
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=postgres;Port=5432;Database=cohestra;Username=cohestra;Password=synthetic-postgres-password-32",
                ["ConnectionStrings:Redis"] = "redis:6379,password=synthetic-redis-password-32chars",
                ["PublicWeb:BaseUrl"] = "https://cohestra.app",
                ["Cors:AllowedOrigins:0"] = "https://cohestra.app",
                ["Cors:AllowedOrigins:1"] = "",
                ["Cors:AllowedOrigins:2"] = "",
                ["SendGrid:ApiKey"] = "SG.syntheticIndependentProdKey",
                ["SendGrid:FromEmail"] = "noreply@cohestra.app",
                ["SendGrid:UseSandbox"] = "false",
            })
            .Build();

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
        Assert.Equal("https://cohestra.app", configuration["Cors:AllowedOrigins:0"]);
        Assert.True(string.IsNullOrEmpty(configuration["Cors:AllowedOrigins:1"]));
        Assert.True(string.IsNullOrEmpty(configuration["Cors:AllowedOrigins:2"]));
    }

    [Fact]
    public void Validate_dedicated_production_allows_cleared_appsettings_cors_slots()
    {
        var configuration = DedicatedProductionConfig(corsOrigin1: "", corsOrigin2: "");

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_merged_localhost_cors_leftover()
    {
        var configuration = DedicatedProductionConfig(corsOrigin1: "http://localhost:3000");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Cors:AllowedOrigins", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_localhost_cors_origin()
    {
        var configuration = DedicatedProductionConfig(corsOrigin: "http://localhost:3000");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Cors:AllowedOrigins", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("localhost:3000", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_missing_sendgrid()
    {
        var configuration = DedicatedProductionConfig(sendGridApiKey: "");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("SendGrid:ApiKey", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_sendgrid_sandbox()
    {
        var configuration = DedicatedProductionConfig(sendGridUseSandbox: true);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("SendGrid:UseSandbox", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_uat_sendgrid_sender()
    {
        var configuration = DedicatedProductionConfig(sendGridFromEmail: "noreply@uat.cohestra.app");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("SendGrid:FromEmail", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("noreply@", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_shared_host_flag()
    {
        var configuration = DedicatedProductionConfig(sharedHostUat: true);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("COHESTRA_SHARED_HOST_UAT", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_recaptcha_test_bypass()
    {
        var configuration = DedicatedProductionConfig(recaptchaBypass: "test-captcha-pass");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("TestBypassToken", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("test-captcha-pass", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_rejects_live_paddle_on_production_url_without_allow_live()
    {
        var configuration = DedicatedProductionConfig(
            paddleEnvironment: "production",
            paddleApiKey: "pdl_live_apikey",
            paddleClientToken: "live_client");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Contains("Paddle:AllowLive=true", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("pdl_live_apikey", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_dedicated_production_allows_isolated_runtime()
    {
        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(
                DedicatedProductionConfig(),
                new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_uat_production_environment_still_allows_passwordless_redis()
    {
        var configuration = ProductionConfig(
            "Host=postgres;Port=5432;Database=cohestra;Username=crm;Password=uat-isolated-secret-with-sufficient-length",
            paddleEnvironment: "sandbox",
            paddleApiKey: "pdl_sdbx_apikey",
            paddleClientToken: "test_client",
            publicBaseUrl: "https://uat.cohestra.app");

        var exception = Record.Exception(() =>
            ProductionSecurityValidator.Validate(configuration, new StubHostEnvironment(Environments.Production)));

        Assert.Null(exception);
    }

    private static IConfiguration DedicatedProductionConfig(
        string? redis = "redis:6379,password=synthetic-redis-password-32chars",
        string? postgres =
            "Host=postgres;Port=5432;Database=cohestra;Username=cohestra;Password=synthetic-postgres-password-32",
        string? publicBaseUrl = "https://cohestra.app",
        string? corsOrigin = "https://cohestra.app",
        string? corsOrigin1 = null,
        string? corsOrigin2 = null,
        string? sendGridApiKey = "SG.syntheticIndependentProdKey",
        string? sendGridFromEmail = "noreply@cohestra.app",
        bool sendGridUseSandbox = false,
        string? devTenantSlug = null,
        string? tenancyDevTenantSlug = null,
        bool sharedHostUat = false,
        bool platformAdminSeed = false,
        string? operatorSeed = null,
        string? recaptchaBypass = null,
        string? paddleEnvironment = "sandbox",
        string? paddleApiKey = "pdl_sdbx_apikey",
        string? paddleClientToken = "test_client")
    {
        var values = new Dictionary<string, string?>
        {
            ["Cohestra:DeploymentPlane"] = "Production",
            ["Jwt:SigningKey"] = "synthetic-production-jwt-signing-key-44chars",
            ["ConnectionStrings:DefaultConnection"] = postgres,
            ["ConnectionStrings:Redis"] = redis,
            ["PublicWeb:BaseUrl"] = publicBaseUrl,
            ["Cors:AllowedOrigins:0"] = corsOrigin,
            ["SendGrid:ApiKey"] = sendGridApiKey,
            ["SendGrid:FromEmail"] = sendGridFromEmail,
            ["SendGrid:UseSandbox"] = sendGridUseSandbox ? "true" : "false",
            ["Paddle:Environment"] = paddleEnvironment,
            ["Paddle:ApiKey"] = paddleApiKey,
            ["Paddle:ClientToken"] = paddleClientToken,
            ["Paddle:AllowLive"] = "false",
        };
        if (corsOrigin1 is not null)
        {
            values["Cors:AllowedOrigins:1"] = corsOrigin1;
        }

        if (corsOrigin2 is not null)
        {
            values["Cors:AllowedOrigins:2"] = corsOrigin2;
        }

        if (devTenantSlug is not null)
        {
            values["DEV_TENANT_SLUG"] = devTenantSlug;
        }

        if (tenancyDevTenantSlug is not null)
        {
            values["Tenancy:DevTenantSlug"] = tenancyDevTenantSlug;
        }

        if (sharedHostUat)
        {
            values["COHESTRA_SHARED_HOST_UAT"] = "true";
        }

        if (recaptchaBypass is not null)
        {
            values["SelfServeSignup:Recaptcha:TestBypassToken"] = recaptchaBypass;
        }

        if (platformAdminSeed)
        {
            values["PlatformAdminSeed:Enabled"] = "true";
        }

        if (operatorSeed is not null)
        {
            values["OperatorSeed:Enabled"] = operatorSeed;
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
