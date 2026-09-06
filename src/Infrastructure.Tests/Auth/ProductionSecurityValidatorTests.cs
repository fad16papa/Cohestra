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

    private static IConfiguration ProductionConfig(string connectionString) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "production-secret-key-with-sufficient-length",
                ["ConnectionStrings:DefaultConnection"] = connectionString,
            })
            .Build();

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = "/tmp";

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
