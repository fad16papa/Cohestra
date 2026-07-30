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

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = "/tmp";

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
