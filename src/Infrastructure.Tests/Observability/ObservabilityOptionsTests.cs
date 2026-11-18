using Cohestra.Infrastructure.Observability;
using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class ObservabilityOptionsTests
{
    [Fact]
    public void Sdk_disabled_environment_variable_wins()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
                ["OTEL_SDK_DISABLED"] = "true",
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://otelcol:4318",
            })
            .Build();
        var options = ObservabilityOptions.FromConfiguration(configuration);

        Assert.False(options.IsSdkEnabled(configuration));
        Assert.False(options.ShouldExportOtlp(configuration));
    }

    [Fact]
    public void Sdk_disabled_accepts_trimmed_true()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
                ["OTEL_SDK_DISABLED"] = " true ",
            })
            .Build();
        var options = ObservabilityOptions.FromConfiguration(configuration);

        Assert.False(options.IsSdkEnabled(configuration));
    }

    [Fact]
    public void Enabled_false_disables_export()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "false",
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://otelcol:4318",
            })
            .Build();
        var options = ObservabilityOptions.FromConfiguration(configuration);

        Assert.False(options.IsSdkEnabled(configuration));
        Assert.False(options.ShouldExportOtlp(configuration));
    }

    [Fact]
    public void Empty_endpoint_keeps_sdk_but_skips_export()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
            })
            .Build();
        var options = ObservabilityOptions.FromConfiguration(configuration);

        Assert.True(options.IsSdkEnabled(configuration));
        Assert.False(options.ShouldExportOtlp(configuration));
        Assert.Null(options.ResolveOtlpEndpoint(configuration));
    }

    [Fact]
    public void Standard_otlp_endpoint_env_is_consumed()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://otelcol:4318",
            })
            .Build();
        var options = ObservabilityOptions.FromConfiguration(configuration);

        Assert.True(options.ShouldExportOtlp(configuration));
        Assert.Equal("http://otelcol:4318", options.ResolveOtlpEndpoint(configuration));
    }
}
