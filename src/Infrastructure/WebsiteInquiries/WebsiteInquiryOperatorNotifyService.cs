using Cohestra.Application.Email;
using Cohestra.Application.WebsiteInquiries;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.WebsiteInquiries;

public sealed class WebsiteInquiryOperatorNotifyService(
    CohestraDbContext dbContext,
    IEmailSender emailSender,
    IOptions<SendGridSettings> sendGridOptions,
    IOptions<PublicWebOptions> publicWebOptions,
    ILogger<WebsiteInquiryOperatorNotifyService> logger) : IWebsiteInquiryOperatorNotifyService
{
    public async Task<WebsiteInquiryOperatorNotifySendResult> SendOperatorNotifyIfApplicableAsync(
        WebsiteInquiryOperatorNotifyRequest request,
        CancellationToken cancellationToken = default)
    {
        var client = await dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.ClientId, cancellationToken);

        if (client is null)
        {
            logger.LogWarning(
                "Skipped website inquiry operator notify because client {ClientId} was not found.",
                request.ClientId);
            return new WebsiteInquiryOperatorNotifySendResult(false, null);
        }

        var timelineEvent = await dbContext.ClientTimelineEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == request.TimelineEventId && item.ClientId == request.ClientId,
                cancellationToken);

        if (timelineEvent is null)
        {
            logger.LogWarning(
                "Skipped website inquiry operator notify because timeline event {TimelineEventId} was not found.",
                request.TimelineEventId);
            return new WebsiteInquiryOperatorNotifySendResult(false, null);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == client.TenantId, cancellationToken);

        if (tenant is null)
        {
            return new WebsiteInquiryOperatorNotifySendResult(false, null);
        }

        var recipientEmail = tenant.AdminContactEmail?.Trim();
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            logger.LogWarning(
                "Skipped website inquiry operator notify for client {ClientId} because tenant admin contact email is missing.",
                request.ClientId);
            return new WebsiteInquiryOperatorNotifySendResult(false, null);
        }

        var sendGridSettings = sendGridOptions.Value;
        var fromEmail = sendGridSettings.RegistrationFromEmail?.Trim();
        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = sendGridSettings.FromEmail?.Trim();
        }

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            logger.LogWarning(
                "Skipped website inquiry operator notify for client {ClientId} because no sender email is configured.",
                request.ClientId);
            return new WebsiteInquiryOperatorNotifySendResult(false, null);
        }

        var fromName = sendGridSettings.RegistrationFromName?.Trim();
        if (string.IsNullOrWhiteSpace(fromName))
        {
            fromName = sendGridSettings.FromName?.Trim();
        }

        var clientProfileUrl = TenantPublicWebUrlBuilder.BuildTenantPath(
            publicWebOptions.Value.BaseUrl,
            tenant.Slug,
            $"/clients/{client.Id}");

        var emailContent = WebsiteInquiryOperatorNotifyEmailBuilder.Build(
            new WebsiteInquiryOperatorNotifyEmailModel(
                ParticipantName: request.ParticipantName,
                Phone: request.Phone,
                Email: request.Email,
                Message: request.Message,
                ClientProfileUrl: clientProfileUrl));

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                recipientEmail,
                tenant.Name,
                emailContent.Subject,
                emailContent.PlainBody,
                emailContent.HtmlBody,
                FromEmail: fromEmail,
                FromName: fromName,
                InlineAttachments: WebsiteInquiryOperatorNotifyEmailBuilder.BuildInlineAttachments()),
            cancellationToken);

        if (!sendResult.Success)
        {
            logger.LogWarning(
                "Website inquiry operator notify failed for client {ClientId} to {RecipientEmail}: {Reason}",
                request.ClientId,
                recipientEmail,
                sendResult.FailureReason);
            return new WebsiteInquiryOperatorNotifySendResult(false, recipientEmail);
        }

        logger.LogInformation(
            "Website inquiry operator notify sent for client {ClientId} to {RecipientEmail}.",
            request.ClientId,
            recipientEmail);

        return new WebsiteInquiryOperatorNotifySendResult(true, recipientEmail);
    }
}
