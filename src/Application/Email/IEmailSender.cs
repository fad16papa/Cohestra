namespace Cohestra.Application.Email;

public sealed record EmailInlineAttachment(
    string ContentId,
    byte[] Content,
    string ContentType,
    string FileName);

public sealed record EmailFileAttachment(
    string FileName,
    string ContentType,
    byte[] Content);

public sealed record EmailMessage(
    string ToEmail,
    string? ToName,
    string Subject,
    string PlainTextBody,
    string? HtmlBody = null,
    string? FromEmail = null,
    string? FromName = null,
    IReadOnlyList<EmailInlineAttachment>? InlineAttachments = null,
    string? ReplyToEmail = null,
    IReadOnlyList<EmailFileAttachment>? FileAttachments = null);

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
