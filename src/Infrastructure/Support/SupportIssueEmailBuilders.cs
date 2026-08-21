using Cohestra.Application.Email;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportIssueTechEmailBuilder(IOptions<SupportSettings> supportOptions)
{
    public EmailMessage Build(
        SupportIssue issue,
        IReadOnlyList<EmailFileAttachment> attachments)
    {
        var recipient = supportOptions.Value.RecipientEmail.Trim();
        var subject = $"[{issue.IssueNumber}] {issue.Subject}";
        var plainBody = $"""
            Support issue {issue.IssueNumber}

            Tenant: {issue.TenantName} ({issue.TenantSlug})
            Plan: {issue.Plan}
            Operator: {issue.OperatorDisplayName} <{issue.OperatorEmail}>
            User agent: {issue.UserAgent ?? "unknown"}

            Description:
            {issue.Description}
            """;

        var htmlBody = $"""
            <p><strong>Support issue {issue.IssueNumber}</strong></p>
            <ul>
              <li><strong>Tenant:</strong> {System.Net.WebUtility.HtmlEncode(issue.TenantName)} ({System.Net.WebUtility.HtmlEncode(issue.TenantSlug)})</li>
              <li><strong>Plan:</strong> {issue.Plan}</li>
              <li><strong>Operator:</strong> {System.Net.WebUtility.HtmlEncode(issue.OperatorDisplayName)} &lt;{System.Net.WebUtility.HtmlEncode(issue.OperatorEmail)}&gt;</li>
              <li><strong>User agent:</strong> {System.Net.WebUtility.HtmlEncode(issue.UserAgent ?? "unknown")}</li>
            </ul>
            <p><strong>Description</strong></p>
            <p>{System.Net.WebUtility.HtmlEncode(issue.Description).Replace("\n", "<br />", StringComparison.Ordinal)}</p>
            """;

        return new EmailMessage(
            recipient,
            null,
            subject,
            plainBody,
            htmlBody,
            ReplyToEmail: issue.OperatorEmail,
            FileAttachments: attachments.Count > 0 ? attachments : null);
    }
}

public sealed class SupportIssueConfirmationEmailBuilder(
    IOptions<SendGridSettings> sendGridOptions,
    IOptions<EmailBrandingSettings> brandingOptions,
    IOptions<PublicWebOptions> publicWebOptions)
{
    public EmailMessage Build(SupportIssue issue)
    {
        var settings = sendGridOptions.Value;
        var branding = brandingOptions.Value;
        var publicWeb = publicWebOptions.Value;
        var fromEmail = settings.FromEmail.Trim();
        var fromName = settings.FromName.Trim();
        var logoInlineAttachment = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        var logoUrl = logoInlineAttachment is not null
            ? $"cid:{PlatformBrandAssets.LogoInlineContentId}"
            : RegistrationNotificationService.ResolveLogoUrlForEmail(branding, publicWeb);
        var websiteUrl = (branding.WebsiteUrl ?? string.Empty).Trim();

        var content = SupportIssueConfirmationEmailTemplate.Build(
            new SupportIssueConfirmationEmailModel(
                GreetingName: SupportIssueConfirmationEmailTemplate.ResolveGreetingName(
                    issue.OperatorDisplayName,
                    issue.OperatorEmail),
                IssueNumber: issue.IssueNumber,
                Subject: issue.Subject,
                Description: issue.Description,
                TenantName: issue.TenantName,
                TenantSlug: issue.TenantSlug,
                OperatorEmail: issue.OperatorEmail,
                SubmittedAtUtc: issue.CreatedAt,
                AttachmentCount: issue.Attachments.Count,
                LogoUrl: logoUrl,
                WebsiteUrl: websiteUrl));

        return new EmailMessage(
            issue.OperatorEmail,
            issue.OperatorDisplayName,
            content.Subject,
            content.PlainTextBody,
            content.HtmlBody,
            FromEmail: fromEmail,
            FromName: fromName,
            InlineAttachments: logoInlineAttachment is null ? null : [logoInlineAttachment]);
    }
}

public sealed class SupportIssueFilerNotificationEmailBuilder(IOptions<SendGridSettings> sendGridOptions)
{
    public EmailMessage BuildReplyEmail(SupportIssue issue, SupportIssueReply reply)
    {
        var settings = sendGridOptions.Value;
        var subject = $"[{issue.IssueNumber}] Reply from Cohestra support";
        var plainBody = $"""
            Hi {issue.OperatorDisplayName},

            Cohestra support replied to your request {issue.IssueNumber}.

            Subject: {issue.Subject}
            Status: {issue.Status}

            Reply:
            {reply.Body}

            View this thread in Settings → Help in your workspace.
            """;
        var htmlBody = $"""
            <p>Hi {System.Net.WebUtility.HtmlEncode(issue.OperatorDisplayName)},</p>
            <p>Cohestra support replied to your request <strong>{System.Net.WebUtility.HtmlEncode(issue.IssueNumber)}</strong>.</p>
            <p><strong>Subject:</strong> {System.Net.WebUtility.HtmlEncode(issue.Subject)}<br />
            <strong>Status:</strong> {issue.Status}</p>
            <p>{System.Net.WebUtility.HtmlEncode(reply.Body).Replace("\n", "<br />", StringComparison.Ordinal)}</p>
            <p>View this thread in Settings → Help in your workspace.</p>
            """;

        return new EmailMessage(
            issue.OperatorEmail,
            issue.OperatorDisplayName,
            subject,
            plainBody,
            htmlBody,
            FromEmail: settings.FromEmail.Trim(),
            FromName: settings.FromName.Trim());
    }

    public EmailMessage BuildStatusEmail(SupportIssue issue)
    {
        var settings = sendGridOptions.Value;
        var subject = $"[{issue.IssueNumber}] Support request update";
        var plainBody = $"""
            Hi {issue.OperatorDisplayName},

            Your support request {issue.IssueNumber} was updated.

            Subject: {issue.Subject}
            New status: {issue.Status}

            View this thread in Settings → Help in your workspace.
            """;
        var htmlBody = $"""
            <p>Hi {System.Net.WebUtility.HtmlEncode(issue.OperatorDisplayName)},</p>
            <p>Your support request <strong>{System.Net.WebUtility.HtmlEncode(issue.IssueNumber)}</strong> was updated.</p>
            <p><strong>Subject:</strong> {System.Net.WebUtility.HtmlEncode(issue.Subject)}<br />
            <strong>New status:</strong> {issue.Status}</p>
            <p>View this thread in Settings → Help in your workspace.</p>
            """;

        return new EmailMessage(
            issue.OperatorEmail,
            issue.OperatorDisplayName,
            subject,
            plainBody,
            htmlBody,
            FromEmail: settings.FromEmail.Trim(),
            FromName: settings.FromName.Trim());
    }
}
