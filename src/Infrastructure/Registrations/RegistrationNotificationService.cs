using Cohestra.Application.Campaigns;
using Cohestra.Application.Email;
using Cohestra.Application.Registrations;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RegistrationNotificationService(
    CohestraDbContext dbContext,
    IEmailSender emailSender,
    ICampaignAssetService campaignAssetService,
    IOptions<SendGridSettings> sendGridOptions,
    IOptions<EmailBrandingSettings> brandingOptions,
    IOptions<PublicWebOptions> publicWebOptions,
    IOptions<CampaignAssetOptions> campaignAssetOptions,
    ILogger<RegistrationNotificationService> logger) : IRegistrationNotificationService
{
    internal const string HeroInlineContentId = "registration-hero";
    public async Task<RegistrationConfirmationSendResult> SendConfirmationIfApplicableAsync(
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
                "Skipped registration confirmation email because registration {RegistrationId} was not found.",
                registrationId);
            return new RegistrationConfirmationSendResult(false, null);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == registration.TenantId, cancellationToken);

        var recipientEmail = registration.Client.Email?.Trim();
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            return new RegistrationConfirmationSendResult(false, null);
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
                "Skipped registration confirmation email for {RegistrationId} because no sender email is configured.",
                registrationId);
            return new RegistrationConfirmationSendResult(false, recipientEmail);
        }

        var fromName = sendGridSettings.RegistrationFromName?.Trim();
        if (string.IsNullOrWhiteSpace(fromName))
        {
            fromName = sendGridSettings.FromName?.Trim();
        }

        var branding = brandingOptions.Value;
        var brandName = string.IsNullOrWhiteSpace(fromName) ? branding.FooterLegalName : fromName!;
        var logoUrl = ResolveLogoUrl(branding, publicWebOptions.Value);
        var websiteUrl = (branding.WebsiteUrl ?? string.Empty).Trim();
        var footerLegalName = (branding.FooterLegalName ?? brandName).Trim();

        var heroInlineAttachment = await TryLoadHeroInlineAttachmentAsync(
            registration.Activity.HeroImageUrl,
            cancellationToken);
        var heroImageUrl = heroInlineAttachment is not null
            ? $"cid:{HeroInlineContentId}"
            : ResolveHeroImageUrlForEmail(
                registration.Activity.HeroImageUrl,
                tenant?.Slug);

        var emailContent = RegistrationConfirmationEmailBuilder.Build(
            new RegistrationConfirmationEmailModel(
                ParticipantName: registration.Client.FullName,
                ActivityName: registration.Activity.Name,
                Schedule: registration.Activity.Schedule,
                Location: registration.Activity.Location,
                CommunityLabel: registration.Activity.CommunityLabel,
                RegistrationNumber: registration.RegistrationNumber,
                BrandName: brandName,
                FooterLegalName: footerLegalName,
                WebsiteUrl: websiteUrl,
                LogoUrl: logoUrl,
                HeroImageUrl: heroImageUrl));

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                recipientEmail,
                registration.Client.FullName,
                emailContent.Subject,
                emailContent.PlainTextBody,
                emailContent.HtmlBody,
                FromEmail: fromEmail,
                FromName: fromName,
                InlineAttachments: heroInlineAttachment is null
                    ? null
                    : [heroInlineAttachment]),
            cancellationToken);

        if (!sendResult.Success)
        {
            logger.LogWarning(
                "Registration confirmation email failed for {RegistrationId} to {RecipientEmail}: {Reason}",
                registrationId,
                recipientEmail,
                sendResult.FailureReason);
            return new RegistrationConfirmationSendResult(false, recipientEmail);
        }

        logger.LogInformation(
            "Registration confirmation email sent for {RegistrationId} to {RecipientEmail}.",
            registrationId,
            recipientEmail);

        return new RegistrationConfirmationSendResult(true, recipientEmail);
    }

    private async Task<EmailInlineAttachment?> TryLoadHeroInlineAttachmentAsync(
        string? heroImageUrl,
        CancellationToken cancellationToken)
    {
        if (!ActivityHeroImageUrlResolver.TryGetCampaignAssetId(heroImageUrl, out var assetId))
        {
            return null;
        }

        var file = await campaignAssetService.GetFileAsync(assetId, cancellationToken);
        if (file is null || file.Content.Length == 0)
        {
            logger.LogWarning(
                "Registration confirmation email hero asset {AssetId} was not found on disk.",
                assetId);
            return null;
        }

        return new EmailInlineAttachment(
            HeroInlineContentId,
            file.Content,
            file.ContentType,
            file.FileName);
    }

    private string? ResolveHeroImageUrlForEmail(string? heroImageUrl, string? tenantSlug)
    {
        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            return ActivityHeroImageUrlResolver.Resolve(
                heroImageUrl,
                campaignAssetOptions.Value.PublicApiBaseUrl);
        }

        return ActivityHeroImageUrlResolver.ResolveForEmail(
            heroImageUrl,
            publicWebOptions.Value.BaseUrl,
            tenantSlug);
    }

    internal static string? ResolveLogoUrl(
        EmailBrandingSettings branding,
        PublicWebOptions publicWeb)
    {
        var configured = branding.LogoUrl?.Trim();
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        var baseUrl = publicWeb.BaseUrl?.Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        return $"{baseUrl}{EmailBrandingSettings.DefaultLogoPath}";
    }
}
