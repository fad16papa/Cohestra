using OpenTelemetry;
using OpenTelemetry.Logs;

namespace Cohestra.Infrastructure.Observability;

public sealed class TelemetryRedactingLogProcessor : BaseProcessor<LogRecord>
{
    public override void OnEnd(LogRecord data)
    {
        if (data is null)
        {
            return;
        }

        if (data.FormattedMessage is not null)
        {
            data.FormattedMessage = TelemetryRedactor.Redact(data.FormattedMessage);
        }

        if (data.Body is string body)
        {
            data.Body = TelemetryRedactor.Redact(body);
        }

        if (data.Attributes is { Count: > 0 } attributes)
        {
            var redacted = new List<KeyValuePair<string, object?>>(attributes.Count);
            foreach (var attribute in attributes)
            {
                redacted.Add(new KeyValuePair<string, object?>(
                    attribute.Key,
                    TelemetryRedactor.RedactValue(attribute.Key, attribute.Value)));
            }

            data.Attributes = redacted;
        }
    }
}
