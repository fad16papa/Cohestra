using Cohestra.Api.Observability;
using Cohestra.Infrastructure.Observability;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Trace;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class OpenTelemetryRegistrationTests
{
    [Fact]
    public void Disabled_sdk_registers_no_tracer_provider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "false",
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://127.0.0.1:1",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCohestraOpenTelemetry(configuration, new FakeHostEnvironment());

        using var provider = services.BuildServiceProvider();
        Assert.Null(provider.GetService<TracerProvider>());
    }

    [Fact]
    public void Enabled_sdk_without_endpoint_registers_instrumentation_only()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCohestraOpenTelemetry(configuration, new FakeHostEnvironment());

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetService<TracerProvider>());
        Assert.DoesNotContain(
            services,
            descriptor => descriptor.ServiceType == typeof(IHealthCheck));
    }

    [Fact]
    public void Registration_does_not_add_ready_health_checks()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenTelemetry:Enabled"] = "true",
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://127.0.0.1:1",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCohestraOpenTelemetry(configuration, new FakeHostEnvironment());

        Assert.DoesNotContain(
            services,
            descriptor =>
                descriptor.ServiceType == typeof(HealthCheckService)
                || descriptor.ServiceType == typeof(IHealthCheck)
                || (descriptor.ImplementationType?.Name.Contains("HealthCheck", StringComparison.Ordinal) ?? false));
        Assert.True(CohestraTelemetry.IsAlwaysOnActivity(CohestraTelemetry.OutboxDispatchActivity));
    }
}
