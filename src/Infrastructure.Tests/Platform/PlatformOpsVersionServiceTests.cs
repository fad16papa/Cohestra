using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Platform;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformOpsVersionServiceTests
{
    private const string FullSha = "0123456789abcdef0123456789abcdef01234567";
    private const string Sha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    [Fact]
    public void Get_valid_full_sha_is_actual()
    {
        var result = CreateService(FullSha, "Production").Get();

        Assert.Equal(FullSha, result.GitSha.Value);
        Assert.Equal(PlatformKpiSources.GitSha, result.GitSha.Source);
        Assert.Equal(PlatformKpiFreshness.Actual, result.GitSha.Freshness);
        Assert.Equal("Production", result.EnvironmentName.Value);
        Assert.Equal(PlatformKpiSources.HostEnvironment, result.EnvironmentName.Source);
        Assert.Equal(PlatformKpiFreshness.Actual, result.EnvironmentName.Freshness);
        Assert.Equal("v1", result.ApiVersion.Value);
        Assert.Equal(PlatformKpiSources.ApiContract, result.ApiVersion.Source);
        Assert.Equal(PlatformKpiFreshness.Actual, result.ApiVersion.Freshness);
        Assert.DoesNotContain("Rollback", result.GitSha.Source, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Get_valid_sha256_object_id_is_actual()
    {
        var result = CreateService(Sha256, "Production").Get();

        Assert.Equal(Sha256, result.GitSha.Value);
        Assert.Equal(PlatformKpiFreshness.Actual, result.GitSha.Freshness);
        Assert.Equal(PlatformKpiSources.GitSha, result.GitSha.Source);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Get_missing_or_blank_sha_is_missing_instrumentation(string? sha)
    {
        var result = CreateService(sha, "Development").Get();

        Assert.Null(result.GitSha.Value);
        Assert.Equal(PlatformKpiSources.NotInstrumented, result.GitSha.Source);
        Assert.Equal(PlatformKpiFreshness.MissingInstrumentation, result.GitSha.Freshness);
        Assert.Equal("Development", result.EnvironmentName.Value);
        Assert.Equal("v1", result.ApiVersion.Value);
    }

    [Theory]
    [InlineData("latest")]
    [InlineData("v1")]
    [InlineData("main")]
    [InlineData("abcdef1")]
    [InlineData("not-a-sha")]
    [InlineData("0123456789abcdef0123456789abcdef012345678")]
    public void Get_malformed_sha_is_unavailable_and_not_echoed(string sha)
    {
        var result = CreateService(sha, "Production").Get();

        Assert.Null(result.GitSha.Value);
        Assert.Equal(PlatformKpiSources.GitShaMalformed, result.GitSha.Source);
        Assert.Equal(PlatformKpiFreshness.Unavailable, result.GitSha.Freshness);
        Assert.NotEqual("v1", result.GitSha.Value);
    }

    [Fact]
    public void Get_does_not_dump_configuration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GIT_SHA"] = FullSha,
                ["ConnectionStrings:DefaultConnection"] = "Host=secret;Password=super-secret",
                ["Jwt:SigningKey"] = "do-not-leak-this-key-value-please!!!!",
            })
            .Build();
        var json = System.Text.Json.JsonSerializer.Serialize(
            new PlatformOpsVersionService(new StubHostEnvironment("Production"), config).Get());

        Assert.DoesNotContain("super-secret", json, StringComparison.Ordinal);
        Assert.DoesNotContain("do-not-leak", json, StringComparison.Ordinal);
        Assert.DoesNotContain("ConnectionStrings", json, StringComparison.Ordinal);
        Assert.Contains(FullSha, json, StringComparison.Ordinal);
    }

    private static PlatformOpsVersionService CreateService(string? gitSha, string environment)
    {
        var values = new Dictionary<string, string?>();
        if (gitSha is not null)
        {
            values["GIT_SHA"] = gitSha;
        }

        return new PlatformOpsVersionService(
            new StubHostEnvironment(environment),
            new ConfigurationBuilder().AddInMemoryCollection(values).Build());
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "Api";
        public string ContentRootPath { get; set; } = "/tmp";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
