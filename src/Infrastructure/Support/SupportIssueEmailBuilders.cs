using Cohestra.Application.Email;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Email;
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

public sealed class SupportIssueConfirmationEmailBuilder(IOptions<SendGridSettings> sendGridOptions)
{
    public EmailMessage Build(SupportIssue issue)
    {
        var settings = sendGridOptions.Value;
        var fromEmail = settings.FromEmail.Trim();
        var fromName = settings.FromName.Trim();
        var subject = $"We received your support request {issue.IssueNumber}";
        var plainBody = $"""
            Hi {issue.OperatorDisplayName},

            We received your support request.

            Your support ID: {issue.IssueNumber}

            Please quote this ID in any follow-up email. Our team will reply to {issue.OperatorEmail}.

            Subject: {issue.Subject}
            """;

        var htmlBody = $"""
            <p>Hi {System.Net.WebUtility.HtmlEncode(issue.OperatorDisplayName)},</p>
            <p>We received your support request.</p>
            <p><strong>Your support ID:</strong> {System.Net.WebUtility.HtmlEncode(issue.IssueNumber)}</p>
            <p>Please quote this ID in any follow-up email. Our team will reply to {System.Net.WebUtility.HtmlEncode(issue.OperatorEmail)}.</p>
            <p><strong>Subject:</strong> {System.Net.WebUtility.HtmlEncode(issue.Subject)}</p>
            """;

        return new EmailMessage(
            issue.OperatorEmail,
            issue.OperatorDisplayName,
            subject,
            plainBody,
            htmlBody,
            FromEmail: fromEmail,
            FromName: fromName);
    }
}
