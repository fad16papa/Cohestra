using System.Diagnostics;
using OpenTelemetry;

namespace Cohestra.Infrastructure.Observability;

public sealed class TelemetryRedactingActivityProcessor : BaseProcessor<Activity>
{
    public override void OnEnd(Activity data)
    {
        if (data is null)
        {
            return;
        }

        foreach (var tag in data.TagObjects.ToArray())
        {
            var redacted = TelemetryRedactor.RedactValue(tag.Key, tag.Value);
            if (!Equals(redacted, tag.Value))
            {
                data.SetTag(tag.Key, redacted);
            }
        }

        if (!string.IsNullOrWhiteSpace(data.DisplayName)
            && TelemetryRedactor.ContainsForbiddenResidue(data.DisplayName))
        {
            data.DisplayName = TelemetryRedactor.Redact(data.DisplayName) ?? CohestraTelemetry.ServiceName;
        }

        if (data.StatusDescription is not null
            && TelemetryRedactor.ContainsForbiddenResidue(data.StatusDescription))
        {
            data.SetStatus(data.Status, TelemetryRedactor.Redact(data.StatusDescription));
        }
    }
}
