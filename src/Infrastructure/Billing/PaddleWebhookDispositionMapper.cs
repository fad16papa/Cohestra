using Cohestra.Domain.Billing;

namespace Cohestra.Infrastructure.Billing;

public static class PaddleWebhookDispositionMapper
{
    public static PaddleWebhookDeliveryDisposition ToDelivery(PaddleWebhookDisposition disposition) =>
        disposition switch
        {
            PaddleWebhookDisposition.Processed => PaddleWebhookDeliveryDisposition.Processed,
            PaddleWebhookDisposition.Duplicate => PaddleWebhookDeliveryDisposition.Duplicate,
            PaddleWebhookDisposition.Ignored => PaddleWebhookDeliveryDisposition.Ignored,
            PaddleWebhookDisposition.Retryable => PaddleWebhookDeliveryDisposition.Retryable,
            _ => PaddleWebhookDeliveryDisposition.Rejected,
        };

    public static bool TryParse(string? raw, out PaddleWebhookDeliveryDisposition disposition)
    {
        disposition = default;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        return Enum.TryParse(raw.Trim(), ignoreCase: true, out disposition)
            && Enum.IsDefined(disposition);
    }
}
