using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class ObservabilityCollectorOutageWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("OpenTelemetry:Enabled", "true");
        builder.UseSetting("OpenTelemetry:OtlpEndpoint", "http://127.0.0.1:1");
        builder.UseSetting("OpenTelemetry:Protocol", "http/protobuf");
        builder.UseSetting("OpenTelemetry:UseSimpleExportProcessor", "true");
        builder.UseSetting("OpenTelemetry:TracesSamplerRatio", "1");
    }
}
