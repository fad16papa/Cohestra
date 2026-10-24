using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Observability;

public sealed class ObservabilityOptions
{
    public const string SectionName = "OpenTelemetry";

    public bool Enabled { get; set; } = true;

    public string ServiceName { get; set; } = CohestraTelemetry.ServiceName;

    public string? OtlpEndpoint { get; set; }

    public string Protocol { get; set; } = "http/protobuf";

    public double TracesSamplerRatio { get; set; } = 0.1;

    public bool UseSimpleExportProcessor { get; set; }

    public static ObservabilityOptions FromConfiguration(IConfiguration configuration)
    {
        var options = configuration.GetSection(SectionName).Get<ObservabilityOptions>()
            ?? new ObservabilityOptions();
        return options;
    }

    public bool IsSdkEnabled(IConfiguration configuration) =>
        Enabled && !IsSdkDisabledByEnvironment(configuration);

    public bool ShouldExportOtlp(IConfiguration configuration) =>
        IsSdkEnabled(configuration) && !string.IsNullOrWhiteSpace(ResolveOtlpEndpoint(configuration));

    public string? ResolveOtlpEndpoint(IConfiguration configuration)
    {
        if (!string.IsNullOrWhiteSpace(OtlpEndpoint))
        {
            return OtlpEndpoint.Trim();
        }

        var fromEnv = configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
        return string.IsNullOrWhiteSpace(fromEnv) ? null : fromEnv.Trim();
    }

    public static bool IsSdkDisabledByEnvironment(IConfiguration configuration)
    {
        var raw = configuration["OTEL_SDK_DISABLED"]?.Trim();
        return raw is "1" || bool.TryParse(raw, out var disabled) && disabled;
    }

    public bool IsHttpProtobuf() =>
        Protocol.Equals("http/protobuf", StringComparison.OrdinalIgnoreCase)
        || Protocol.Equals("http", StringComparison.OrdinalIgnoreCase);
}
