using LeadGenerationCrm.Application.Email;
using Microsoft.Extensions.Logging;

namespace LeadGenerationCrm.Infrastructure.Email;

public sealed class NullEmailSender(ILogger<NullEmailSender> logger) : IEmailSender
{
    public Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Email send skipped (SendGrid not configured). To={ToEmail} Subject={Subject}",
            message.ToEmail,
            message.Subject);

        return Task.FromResult(new EmailSendResult(
            false,
            null,
            "Email delivery is not configured."));
    }
}
