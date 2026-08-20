using System.Globalization;
using System.Net;
using System.Text;

namespace Cohestra.Infrastructure.Support;

public sealed record SupportIssueConfirmationEmailContent(
    string Subject,
    string PlainTextBody,
    string HtmlBody);

public sealed record SupportIssueConfirmationEmailModel(
    string GreetingName,
    string IssueNumber,
    string Subject,
    string Description,
    string TenantName,
    string TenantSlug,
    string OperatorEmail,
    DateTimeOffset SubmittedAtUtc,
    int AttachmentCount,
    string? LogoUrl,
    string WebsiteUrl);

internal static class SupportIssueConfirmationEmailTemplate
{
    internal const string PrimaryColor = "#2d6a4f";
    internal const string BackgroundColor = "#fafaf8";
    internal const string TextColor = "#1a1714";
    internal const string MutedTextColor = "#6b6560";
    internal const string EmailBannerBackground = "#f3f5f7";
    internal const string EmailBannerBorder = "#e6e9ed";
    internal const string FooterBrandLine = "Cohestra by Creativorare";

    public static SupportIssueConfirmationEmailContent Build(SupportIssueConfirmationEmailModel model)
    {
        var subject = $"We received your support request — {model.IssueNumber}";
        return new SupportIssueConfirmationEmailContent(
            subject,
            BuildPlainText(model),
            BuildHtml(model));
    }

    internal static string ResolveGreetingName(string displayName, string email)
    {
        var trimmed = displayName.Trim();
        if (string.IsNullOrWhiteSpace(trimmed) ||
            trimmed.Contains('@', StringComparison.Ordinal) ||
            string.Equals(trimmed, email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return "there";
        }

        return trimmed;
    }

    internal static string BuildPlainText(SupportIssueConfirmationEmailModel model)
    {
        var year = model.SubmittedAtUtc.UtcDateTime.Year;
        var submittedAt = FormatSubmittedAt(model.SubmittedAtUtc);
        var builder = new StringBuilder();

        builder.AppendLine("Cohestra");
        builder.AppendLine(new string('=', 8));
        builder.AppendLine();
        builder.AppendLine($"Hi {model.GreetingName},");
        builder.AppendLine();
        builder.AppendLine("Thank you for contacting Cohestra support. We've received your request and added it to our production support queue.");
        builder.AppendLine();
        builder.AppendLine($"Support ID: {model.IssueNumber}");
        builder.AppendLine("Please quote this ID in any follow-up email so we can find your thread quickly.");
        builder.AppendLine();
        builder.AppendLine("Your request");
        builder.AppendLine(new string('-', 13));
        builder.AppendLine($"Subject: {model.Subject}");
        builder.AppendLine($"Workspace: {model.TenantName} ({model.TenantSlug})");
        builder.AppendLine($"Submitted: {submittedAt}");
        if (model.AttachmentCount > 0)
        {
            builder.AppendLine(
                $"Attachments: {model.AttachmentCount} file{(model.AttachmentCount == 1 ? string.Empty : "s")} received");
        }

        builder.AppendLine();
        builder.AppendLine("Description");
        builder.AppendLine(new string('-', 11));
        builder.AppendLine(model.Description.Trim());
        builder.AppendLine();
        builder.AppendLine("What happens next");
        builder.AppendLine(new string('-', 17));
        builder.AppendLine("• Our support team will review your request.");
        builder.AppendLine($"• Replies will be sent to {model.OperatorEmail}.");
        builder.AppendLine("• You can also follow the thread in your workspace under Settings → Help & support.");
        builder.AppendLine();
        builder.AppendLine(new string('-', 40));
        builder.AppendLine($"{FooterBrandLine} © {year}");
        if (!string.IsNullOrWhiteSpace(model.WebsiteUrl))
        {
            builder.AppendLine(model.WebsiteUrl.Trim());
        }

        builder.AppendLine();
        builder.AppendLine("This message confirms we received your support request.");
        return builder.ToString().TrimEnd();
    }

    internal static string BuildHtml(SupportIssueConfirmationEmailModel model)
    {
        var year = model.SubmittedAtUtc.UtcDateTime.Year;
        var encodedGreeting = Encode(model.GreetingName);
        var encodedIssueNumber = Encode(model.IssueNumber);
        var encodedSubject = Encode(model.Subject);
        var encodedDescription = EncodeMultiline(model.Description);
        var encodedTenantName = Encode(model.TenantName);
        var encodedTenantSlug = Encode(model.TenantSlug);
        var encodedEmail = Encode(model.OperatorEmail);
        var encodedWebsite = Encode(model.WebsiteUrl);
        var websiteHref = EncodeAttribute(model.WebsiteUrl);
        var submittedAt = Encode(FormatSubmittedAt(model.SubmittedAtUtc));

        var headerBlock = string.IsNullOrWhiteSpace(model.LogoUrl)
            ? $"""<p style="margin:0;font-size:22px;font-weight:700;color:{TextColor};letter-spacing:0.02em;">Cohestra</p>"""
            : $"""<img src="{EncodeAttribute(model.LogoUrl)}" alt="Cohestra" width="96" style="display:block;max-width:96px;height:auto;margin:0 auto;" />""";

        var attachmentRow = model.AttachmentCount > 0
            ? $"""
              <tr>
                <td style="padding:8px 0;font-size:14px;color:{MutedTextColor};width:120px;vertical-align:top;">Attachments</td>
                <td style="padding:8px 0;font-size:14px;color:{TextColor};">{model.AttachmentCount} file{(model.AttachmentCount == 1 ? string.Empty : "s")} received</td>
              </tr>
              """
            : string.Empty;

        var websiteBlock = string.IsNullOrWhiteSpace(model.WebsiteUrl)
            ? string.Empty
            : $"""
              <p style="margin:0 0 12px;font-size:13px;">
                <a href="{websiteHref}" style="color:{PrimaryColor};text-decoration:none;">{encodedWebsite}</a>
              </p>
              """;

        return $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>{Encode($"Support request received — {model.IssueNumber}")}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#eceae6;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:{BackgroundColor};border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
                      <tr>
                        <td style="background-color:{EmailBannerBackground};border-bottom:1px solid {EmailBannerBorder};padding:32px 24px 28px;text-align:center;">
                          {headerBlock}
                          <p style="margin:16px 0 0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:{PrimaryColor};">Production support</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px 28px 8px;">
                          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:{TextColor};">We received your request</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{MutedTextColor};">
                            Hi {encodedGreeting}, thank you for reaching out. Your request is now in our support queue and will be reviewed by the Cohestra team.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 24px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(45,106,79,0.25);background-color:rgba(45,106,79,0.06);border-radius:12px;">
                            <tr>
                              <td style="padding:20px;text-align:center;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{MutedTextColor};">Your support ID</p>
                                <p style="margin:0 0 8px;font-family:Consolas,Monaco,monospace;font-size:20px;font-weight:700;letter-spacing:0.04em;color:{TextColor};">{encodedIssueNumber}</p>
                                <p style="margin:0;font-size:14px;line-height:1.5;color:{MutedTextColor};">Quote this ID in any follow-up email so we can locate your thread quickly.</p>
                              </td>
                            </tr>
                          </table>

                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e8e4df;background-color:rgba(250,250,248,0.9);border-radius:12px;">
                            <tr>
                              <td style="padding:18px 20px;">
                                <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{PrimaryColor};">Request summary</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="padding:8px 0;font-size:14px;color:{MutedTextColor};width:120px;vertical-align:top;">Subject</td>
                                    <td style="padding:8px 0;font-size:14px;font-weight:600;color:{TextColor};">{encodedSubject}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px 0;font-size:14px;color:{MutedTextColor};width:120px;vertical-align:top;">Workspace</td>
                                    <td style="padding:8px 0;font-size:14px;color:{TextColor};">{encodedTenantName} <span style="color:{MutedTextColor};">({encodedTenantSlug})</span></td>
                                  </tr>
                                  <tr>
                                    <td style="padding:8px 0;font-size:14px;color:{MutedTextColor};width:120px;vertical-align:top;">Submitted</td>
                                    <td style="padding:8px 0;font-size:14px;color:{TextColor};">{submittedAt}</td>
                                  </tr>
                                  {attachmentRow}
                                </table>
                              </td>
                            </tr>
                          </table>

                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e8e4df;border-radius:12px;">
                            <tr>
                              <td style="padding:18px 20px;">
                                <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{PrimaryColor};">Description</p>
                                <p style="margin:0;font-size:14px;line-height:1.6;color:{TextColor};">{encodedDescription}</p>
                              </td>
                            </tr>
                          </table>

                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e8e4df;background-color:#ffffff;border-radius:12px;">
                            <tr>
                              <td style="padding:18px 20px;">
                                <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{PrimaryColor};">What happens next</p>
                                <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:{TextColor};">
                                  <li style="margin-bottom:6px;">Our production support team will review your request.</li>
                                  <li style="margin-bottom:6px;">Replies will be sent to <strong>{encodedEmail}</strong>.</li>
                                  <li>Track updates in your workspace under <strong>Settings → Help &amp; support</strong>.</li>
                                </ul>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 28px 28px;border-top:1px solid #e8e4df;text-align:center;">
                          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:{TextColor};">{FooterBrandLine} © {year}</p>
                          {websiteBlock}
                          <p style="margin:0;font-size:12px;line-height:1.5;color:{MutedTextColor};">
                            This message confirms we received your support request.<br />
                            Please reply from the email address above so we can match your thread.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string FormatSubmittedAt(DateTimeOffset submittedAtUtc) =>
        submittedAtUtc.UtcDateTime.ToString("MMMM d, yyyy 'at' h:mm tt 'UTC'", CultureInfo.InvariantCulture);

    private static string Encode(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);

    private static string EncodeAttribute(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);

    private static string EncodeMultiline(string? value) =>
        Encode(value).Replace("\n", "<br />", StringComparison.Ordinal);
}
