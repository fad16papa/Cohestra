namespace LeadGenerationCrm.Application.Email;

public sealed record EmailMessage(
    string ToEmail,
    string? ToName,
    string Subject,
    string PlainTextBody,
    string? HtmlBody = null,
    string? FromEmail = null,
    string? FromName = null);

public sealed record EmailSendResult(
    bool Success,
    string? ProviderMessageId,
    string? FailureReason);

public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default);
}
