using Cohestra.Infrastructure.Observability;
using Cohestra.Infrastructure.Tenancy;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Cohestra.Api.Observability;

public static class OpenTelemetryServiceCollectionExtensions
{
    private static readonly string[] HttpDurationTagKeys =
    [
        "http.request.method",
        "http.route",
        "http.response.status_code",
    ];

    public static IServiceCollection AddCohestraOpenTelemetry(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var options = ObservabilityOptions.FromConfiguration(configuration);
        services.Configure<ObservabilityOptions>(configuration.GetSection(ObservabilityOptions.SectionName));

        if (!options.IsSdkEnabled(configuration))
        {
            return services;
        }

        services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService(
                serviceName: string.IsNullOrWhiteSpace(options.ServiceName)
                    ? CohestraTelemetry.ServiceName
                    : options.ServiceName.Trim(),
                serviceVersion: ResolveServiceVersion(configuration)))
            .WithTracing(tracing =>
            {
                tracing
                    .SetSampler(new ParentBasedSampler(new CohestraTraceSampler(options.TracesSamplerRatio)))
                    .AddSource(CohestraTelemetry.ActivitySourceName)
                    .AddProcessor(new TelemetryRedactingActivityProcessor())
                    .AddAspNetCoreInstrumentation(aspNet =>
                    {
                        aspNet.RecordException = true;
                        aspNet.EnrichWithHttpResponse = (activity, response) =>
                        {
                            var tenant = response.HttpContext.RequestServices.GetService<CurrentTenant>();
                            if (tenant?.TenantId is Guid tenantId)
                            {
                                activity.SetTag("tenant.id", tenantId.ToString());
                            }
                        };
                    })
                    .AddHttpClientInstrumentation(http =>
                    {
                        http.RecordException = true;
                    })
                    .AddEntityFrameworkCoreInstrumentation()
                    .AddRedisInstrumentation(redis =>
                    {
                        redis.SetVerboseDatabaseStatements = false;
                    });

                TryAddOtlpExporter(tracing, options, configuration);
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddMeter(CohestraTelemetry.MeterName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddView(
                        "http.server.request.duration",
                        new MetricStreamConfiguration { TagKeys = HttpDurationTagKeys });

                TryAddOtlpExporter(metrics, options, configuration);
            })
            .WithLogging(logging =>
            {
                logging.AddProcessor(new TelemetryRedactingLogProcessor());
                TryAddOtlpExporter(logging, options, configuration);
            });

        _ = environment;
        return services;
    }

    private static void TryAddOtlpExporter(
        TracerProviderBuilder tracing,
        ObservabilityOptions options,
        IConfiguration configuration)
    {
        if (!TryCreateOtlpOptions(options, configuration, out var otlp, out var simple))
        {
            return;
        }

        if (simple)
        {
            tracing.AddProcessor(new SimpleActivityExportProcessor(new OtlpTraceExporter(otlp)));
            return;
        }

        tracing.AddOtlpExporter(exporter => CopyOtlp(otlp, exporter));
    }

    private static void TryAddOtlpExporter(
        MeterProviderBuilder metrics,
        ObservabilityOptions options,
        IConfiguration configuration)
    {
        if (!TryCreateOtlpOptions(options, configuration, out var otlp, out _))
        {
            return;
        }

        metrics.AddOtlpExporter(exporter => CopyOtlp(otlp, exporter));
    }

    private static void TryAddOtlpExporter(
        LoggerProviderBuilder logging,
        ObservabilityOptions options,
        IConfiguration configuration)
    {
        if (!TryCreateOtlpOptions(options, configuration, out var otlp, out var simple))
        {
            return;
        }

        if (simple)
        {
            logging.AddProcessor(new SimpleLogRecordExportProcessor(new OtlpLogExporter(otlp)));
            return;
        }

        logging.AddOtlpExporter(exporter => CopyOtlp(otlp, exporter));
    }

    private static bool TryCreateOtlpOptions(
        ObservabilityOptions options,
        IConfiguration configuration,
        out OtlpExporterOptions otlp,
        out bool simple)
    {
        otlp = new OtlpExporterOptions();
        simple = options.UseSimpleExportProcessor;
        if (!options.ShouldExportOtlp(configuration))
        {
            return false;
        }

        var endpoint = options.ResolveOtlpEndpoint(configuration);
        if (string.IsNullOrWhiteSpace(endpoint) || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri))
        {
            return false;
        }

        try
        {
            otlp.Endpoint = uri;
            otlp.Protocol = options.IsHttpProtobuf()
                ? OtlpExportProtocol.HttpProtobuf
                : OtlpExportProtocol.Grpc;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static void CopyOtlp(OtlpExporterOptions source, OtlpExporterOptions destination)
    {
        destination.Endpoint = source.Endpoint;
        destination.Protocol = source.Protocol;
    }

    private static string ResolveServiceVersion(IConfiguration configuration)
    {
        var sha = configuration["GIT_SHA"];
        return string.IsNullOrWhiteSpace(sha) ? "unknown" : sha.Trim();
    }
}
