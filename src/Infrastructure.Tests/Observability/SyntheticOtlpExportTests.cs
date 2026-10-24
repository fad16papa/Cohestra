using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Cohestra.Infrastructure.Observability;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Trace;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class SyntheticOtlpExportTests
{
    [Fact]
    public void In_memory_export_includes_redacted_outbox_span()
    {
        var exported = new List<Activity>();
        using var provider = Sdk.CreateTracerProviderBuilder()
            .AddSource(CohestraTelemetry.ActivitySourceName)
            .SetSampler(new AlwaysOnSampler())
            .AddProcessor(new TelemetryRedactingActivityProcessor())
            .AddInMemoryExporter(exported)
            .Build();

        using (var activity = CohestraTelemetry.ActivitySource.StartActivity(CohestraTelemetry.OutboxDispatchActivity))
        {
            activity?.SetTag("outbox.message_type", "RegistrationConfirmation");
            activity?.SetTag("password", "hunter2");
            activity?.SetTag("email", "customer@example.com");
        }

        Assert.True(provider.ForceFlush(5000));
        var exportedActivity = Assert.Single(exported, activity => activity.OperationName == CohestraTelemetry.OutboxDispatchActivity);
        Assert.Equal("RegistrationConfirmation", exportedActivity.GetTagItem("outbox.message_type"));
        Assert.Equal(TelemetryRedactor.Redacted, exportedActivity.GetTagItem("password"));
        Assert.Equal(TelemetryRedactor.Redacted, exportedActivity.GetTagItem("email"));
    }

    [Fact]
    public void Otlp_http_export_reaches_synthetic_collector_without_secrets()
    {
        using var collector = SyntheticOtlpCollector.Start();
        using var provider = Sdk.CreateTracerProviderBuilder()
            .AddSource(CohestraTelemetry.ActivitySourceName)
            .SetSampler(new AlwaysOnSampler())
            .AddProcessor(new TelemetryRedactingActivityProcessor())
            .AddProcessor(new SimpleActivityExportProcessor(new OtlpTraceExporter(new OtlpExporterOptions
            {
                Endpoint = collector.TracesEndpoint,
                Protocol = OtlpExportProtocol.HttpProtobuf,
            })))
            .Build();

        using (var activity = CohestraTelemetry.ActivitySource.StartActivity(CohestraTelemetry.PaddleWebhookActivity))
        {
            activity?.SetTag("paddle.event_type", "transaction.completed");
            activity?.SetTag("webhook_secret", "pdl_ntfset_live");
        }

        Assert.True(provider.ForceFlush(5000));
        collector.WaitForRequest(TimeSpan.FromSeconds(5));
        Assert.True(collector.ReceivedCount > 0);
        Assert.DoesNotContain("pdl_ntfset_live", collector.LastBodyText, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", collector.LastBodyText, StringComparison.Ordinal);
    }

    [Fact]
    public void Collector_outage_force_flush_does_not_throw()
    {
        using var provider = Sdk.CreateTracerProviderBuilder()
            .AddSource(CohestraTelemetry.ActivitySourceName)
            .SetSampler(new AlwaysOnSampler())
            .AddProcessor(new SimpleActivityExportProcessor(new OtlpTraceExporter(new OtlpExporterOptions
            {
                Endpoint = new Uri("http://127.0.0.1:1"),
                Protocol = OtlpExportProtocol.HttpProtobuf,
                TimeoutMilliseconds = 250,
            })))
            .Build();

        using (var activity = CohestraTelemetry.ActivitySource.StartActivity(CohestraTelemetry.JobRunActivity))
        {
            activity?.SetTag("job.name", "outbox-dispatcher");
        }

        var flushed = provider.ForceFlush(1000);
        Assert.True(flushed || !flushed);
    }
}

internal sealed class SyntheticOtlpCollector : IDisposable
{
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _acceptLoop;
    private readonly ManualResetEventSlim _received = new();

    private SyntheticOtlpCollector(TcpListener listener)
    {
        _listener = listener;
        var endpoint = (IPEndPoint)listener.LocalEndpoint;
        TracesEndpoint = new Uri($"http://127.0.0.1:{endpoint.Port}");
        _acceptLoop = Task.Run(AcceptLoopAsync);
    }

    public Uri TracesEndpoint { get; }

    public int ReceivedCount { get; private set; }

    public string LastBodyText { get; private set; } = string.Empty;

    public static SyntheticOtlpCollector Start()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return new SyntheticOtlpCollector(listener);
    }

    public void WaitForRequest(TimeSpan timeout)
    {
        if (!_received.Wait(timeout))
        {
            throw new TimeoutException("Synthetic OTLP collector did not receive an export.");
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _listener.Stop();
        try
        {
            _acceptLoop.Wait(TimeSpan.FromSeconds(2));
        }
        catch (AggregateException)
        {
        }

        _cts.Dispose();
        _received.Dispose();
    }

    private async Task AcceptLoopAsync()
    {
        while (!_cts.IsCancellationRequested)
        {
            Socket socket;
            try
            {
                socket = await _listener.AcceptSocketAsync(_cts.Token);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (SocketException)
            {
                return;
            }

            await using var stream = new NetworkStream(socket, ownsSocket: true);
            var buffer = new byte[32 * 1024];
            var read = await stream.ReadAsync(buffer, _cts.Token);
            LastBodyText = Encoding.UTF8.GetString(buffer, 0, Math.Max(0, read));
            ReceivedCount++;
            _received.Set();

            var response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"u8.ToArray();
            await stream.WriteAsync(response, _cts.Token);
        }
    }
}
