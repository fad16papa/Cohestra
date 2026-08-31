namespace Cohestra.Application.WebsiteInquiries;

public interface IWebsiteInquiryOperatorNotifyService
{
    Task<WebsiteInquiryOperatorNotifySendResult> SendOperatorNotifyIfApplicableAsync(
        Guid clientId,
        Guid timelineEventId,
        CancellationToken cancellationToken = default);
}

public sealed record WebsiteInquiryOperatorNotifySendResult(bool Sent, string? RecipientEmail);
