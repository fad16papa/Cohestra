using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Billing;

public static class PaddleWebhookHttp
{
    public static int StatusCodeFor(PaddleWebhookProcessResult result) =>
        result.Disposition switch
        {
            PaddleWebhookDisposition.Processed => StatusCodes.Status200OK,
            PaddleWebhookDisposition.Duplicate => StatusCodes.Status200OK,
            PaddleWebhookDisposition.Ignored => StatusCodes.Status200OK,
            PaddleWebhookDisposition.Retryable => StatusCodes.Status503ServiceUnavailable,
            _ => StatusCodes.Status400BadRequest,
        };
}
