using Cohestra.Application.Email;
using Cohestra.Application.Registrations;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RegistrationOperatorNotifyService(
    CohestraDbContext dbContext,
    IEmailSender emailSender,
    IOptions<SendGridSettings> sendGridOptions,
    IOptions<PublicWebOptions> publicWebOptions,
    ILogger<RegistrationOperatorNotifyService> logger) : IRegistrationOperatorNotifyService
{
    public async Task<RegistrationOperatorNotifySendResult> SendOperatorNotifyIfApplicableAsync(
        Guid registrationId,
        CancellationToken cancellationToken = default)
    {
        var registration = await dbContext.Registrations
            .AsNoTracking()
            .Include(item => item.Activity)
            .Include(item => item.Client)
            .FirstOrDefaultAsync(item => item.Id == registrationId, cancellationToken);

        if (registration?.Activity is null || registration.Client is null)
        {
            logger.LogWarning(
                "Skipped operator registration notify because registration {RegistrationId} was not found.",
                registrationId);
            return new RegistrationOperatorNotifySendResult(false, null);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == registration.TenantId, cancellationToken);

        if (tenant is null || !tenant.EmailOnNewRegistration)
        {
            return new RegistrationOperatorNotifySendResult(false, null);
        }

        var recipientEmail = tenant.AdminContactEmail?.Trim();
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            logger.LogWarning(
                "Skipped operator registration notify for {RegistrationId} because tenant admin contact email is missing.",
                registrationId);
            return new RegistrationOperatorNotifySendResult(false, null);
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
                "Skipped operator registration notify for {RegistrationId} because no sender email is configured.",
                registrationId);
            return new RegistrationOperatorNotifySendResult(false, recipientEmail);
        }

        var fromName = sendGridSettings.RegistrationFromName?.Trim();
        if (string.IsNullOrWhiteSpace(fromName))
        {
            fromName = sendGridSettings.FromName?.Trim();
        }

        var client = registration.Client;
        var activity = registration.Activity;
        var registrationsUrl = TenantPublicWebUrlBuilder.BuildTenantPath(
            publicWebOptions.Value.BaseUrl,
            tenant.Slug,
            $"/activities/{activity.Id}?tab=registrations");

        var hiddenAnswers = RegistrationOperatorNotifyEmailBuilder.BuildHiddenAnswers(
            activity.FormSchema,
            registration.Answers);

        var emailContent = RegistrationOperatorNotifyEmailBuilder.Build(
            new RegistrationOperatorNotifyEmailModel(
                ActivityName: activity.Name,
                ParticipantName: client.FullName,
                Phone: client.Phone,
                Email: client.Email,
                RegistrationNumber: registration.RegistrationNumber,
                RegistrationsUrl: registrationsUrl,
                HiddenAnswers: hiddenAnswers));

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                recipientEmail,
                tenant.Name,
                emailContent.Subject,
                emailContent.PlainBody,
                emailContent.HtmlBody,
                FromEmail: fromEmail,
                FromName: fromName,
                InlineAttachments: RegistrationOperatorNotifyEmailBuilder.BuildInlineAttachments()),
            cancellationToken);

        if (!sendResult.Success)
        {
            logger.LogWarning(
                "Operator registration notify failed for {RegistrationId} to {RecipientEmail}: {Reason}",
                registrationId,
                recipientEmail,
                sendResult.FailureReason);
            return new RegistrationOperatorNotifySendResult(false, recipientEmail);
        }

        logger.LogInformation(
            "Operator registration notify sent for {RegistrationId} to {RecipientEmail}.",
            registrationId,
            recipientEmail);

        return new RegistrationOperatorNotifySendResult(true, recipientEmail);
    }
}
