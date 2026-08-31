namespace Cohestra.Application.WebsiteInquiries;

public interface IWebsiteInquiryOperatorNotifyService
{
    Task<WebsiteInquiryOperatorNotifySendResult> SendOperatorNotifyIfApplicableAsync(
        WebsiteInquiryOperatorNotifyRequest request,
        CancellationToken cancellationToken = default);
}

public sealed record WebsiteInquiryOperatorNotifyRequest(
    Guid ClientId,
    Guid TimelineEventId,
    string ParticipantName,
    string? Phone,
    string? Email,
    string Message);

public sealed record WebsiteInquiryOperatorNotifySendResult(bool Sent, string? RecipientEmail);
