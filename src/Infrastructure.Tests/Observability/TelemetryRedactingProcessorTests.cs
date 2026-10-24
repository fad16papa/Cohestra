using System.Diagnostics;
using Cohestra.Infrastructure.Observability;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class TelemetryRedactingProcessorTests
{
    [Fact]
    public void Activity_processor_redacts_forbidden_tags()
    {
        using var activity = new Activity("outbox.dispatch");
        activity.Start();
        activity.SetTag("password", "hunter2");
        activity.SetTag("email", "customer@example.com");
        activity.SetTag("outbox.message_type", "RegistrationConfirmation");
        activity.SetTag("db.statement", "SELECT * FROM users WHERE email = 'ada@example.com'");

        new TelemetryRedactingActivityProcessor().OnEnd(activity);

        Assert.Equal(TelemetryRedactor.Redacted, activity.GetTagItem("password"));
        Assert.Equal(TelemetryRedactor.Redacted, activity.GetTagItem("email"));
        Assert.Equal("RegistrationConfirmation", activity.GetTagItem("outbox.message_type"));
        Assert.DoesNotContain(
            "ada@example.com",
            activity.GetTagItem("db.statement")?.ToString() ?? string.Empty,
            StringComparison.Ordinal);
        activity.Stop();
    }

    [Fact]
    public void Log_processor_redacts_message_and_attributes()
    {
        var captured = new List<LogRecordSnapshot>();
        using var factory = LoggerFactory.Create(builder =>
        {
            builder.AddOpenTelemetry(options =>
            {
                options.IncludeFormattedMessage = true;
                options.AddProcessor(new TelemetryRedactingLogProcessor());
                options.AddProcessor(new CapturingLogProcessor(captured));
            });
        });

        var logger = factory.CreateLogger("telemetry-redaction");
        logger.LogWarning("Send failed Password={Password} to {ToEmail}", "hunter2", "customer@example.com");
        factory.Dispose();

        Assert.NotEmpty(captured);
        var snapshot = captured[0];
        Assert.DoesNotContain("hunter2", snapshot.FormattedMessage ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain("customer@example.com", snapshot.FormattedMessage ?? string.Empty, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", snapshot.AttributeDump, StringComparison.Ordinal);
        Assert.DoesNotContain("customer@example.com", snapshot.AttributeDump, StringComparison.Ordinal);
    }

    private sealed class CapturingLogProcessor(List<LogRecordSnapshot> sink) : BaseProcessor<LogRecord>
    {
        public override void OnEnd(LogRecord data)
        {
            sink.Add(new LogRecordSnapshot(
                data.FormattedMessage,
                string.Join('|', (data.Attributes ?? []).Select(attribute => $"{attribute.Key}={attribute.Value}"))));
        }
    }

    private sealed record LogRecordSnapshot(string? FormattedMessage, string AttributeDump);
}
