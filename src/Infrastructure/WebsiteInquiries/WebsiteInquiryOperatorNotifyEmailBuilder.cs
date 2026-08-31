using System.Net;
using System.Text;
using Cohestra.Application.Email;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.WebsiteInquiries;

internal sealed record WebsiteInquiryOperatorNotifyEmailModel(
    string ParticipantName,
    string? Phone,
    string? Email,
    string Message,
    string ClientProfileUrl);

internal static class WebsiteInquiryOperatorNotifyEmailBuilder
{
    public static (string Subject, string PlainBody, string HtmlBody) Build(
        WebsiteInquiryOperatorNotifyEmailModel model)
    {
        var subjectParticipant = !string.IsNullOrWhiteSpace(model.ParticipantName)
            ? model.ParticipantName.Trim()
            : !string.IsNullOrWhiteSpace(model.Phone)
                ? model.Phone.Trim()
                : "New contact";

        var subject = SanitizeEmailSubject($"Website inquiry — {subjectParticipant}");

        var plain = new StringBuilder();
        EmailBrandHeaderTemplate.AppendPlainTextHeader(plain, "Website Inquiry");
        plain.AppendLine("Someone submitted the homepage contact form.");
        plain.AppendLine();
        plain.AppendLine($"Name: {FormatValue(model.ParticipantName)}");
        plain.AppendLine($"Phone: {FormatValue(model.Phone)}");
        plain.AppendLine($"Email: {FormatValue(model.Email)}");
        plain.AppendLine();
        plain.AppendLine("Message:");
        plain.AppendLine(SanitizePlainTextField(model.Message));
        plain.AppendLine();
        plain.AppendLine($"View client: {model.ClientProfileUrl}");
        plain.AppendLine();
        plain.AppendLine(new string('-', 40));
        plain.AppendLine($"{EmailBrandHeaderTemplate.FooterBrandLine} © {DateTimeOffset.UtcNow.Year}");

        var logoInline = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        var logoUrl = logoInline is not null
            ? $"cid:{PlatformBrandAssets.LogoInlineContentId}"
            : null;
        var header = EmailBrandHeaderTemplate.BuildHtmlHeader(logoUrl, "Website Inquiry");
        var footer = EmailBrandHeaderTemplate.BuildHtmlFooter(
            DateTimeOffset.UtcNow.Year,
            "You received this because website inquiry notifications are enabled for your workspace.");

        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>{WebUtility.HtmlEncode(subject)}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#eceae6;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:{EmailBrandHeaderTemplate.BackgroundColor};border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
                      <tr>
                        <td style="background-color:{EmailBrandHeaderTemplate.EmailBannerBackground};border-bottom:1px solid {EmailBrandHeaderTemplate.EmailBannerBorder};padding:32px 24px 28px;text-align:center;">
                          {header}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px 28px 8px;">
                          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:{EmailBrandHeaderTemplate.TextColor};">Website inquiry</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">
                            Someone submitted the homepage contact form.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 24px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8e4df;background-color:rgba(250,250,248,0.9);border-radius:12px;">
                            <tr>
                              <td style="padding:18px 20px;font-size:14px;line-height:1.6;color:{EmailBrandHeaderTemplate.TextColor};">
                                <p style="margin:0 0 8px;"><strong>Name:</strong> {WebUtility.HtmlEncode(FormatValue(model.ParticipantName))}</p>
                                <p style="margin:0 0 8px;"><strong>Phone:</strong> {WebUtility.HtmlEncode(FormatValue(model.Phone))}</p>
                                <p style="margin:0 0 8px;"><strong>Email:</strong> {WebUtility.HtmlEncode(FormatValue(model.Email))}</p>
                                <p style="margin:0 0 8px;"><strong>Message:</strong></p>
                                <p style="margin:0;white-space:pre-wrap;">{WebUtility.HtmlEncode(SanitizePlainTextField(model.Message))}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 28px;">
                          <a href="{WebUtility.HtmlEncode(model.ClientProfileUrl)}" style="display:inline-block;background-color:{EmailBrandHeaderTemplate.PrimaryColor};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:999px;">
                            View client profile
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 32px;">
                          {footer}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return (subject, plain.ToString(), html);
    }

    public static IReadOnlyList<EmailInlineAttachment> BuildInlineAttachments()
    {
        var logo = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        return logo is null ? [] : [logo];
    }

    private static string FormatValue(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "—" : value.Trim();

    private static string SanitizePlainTextField(string value) =>
        value.Replace('\r', ' ').Replace('\n', ' ').Trim();

    private static string SanitizeEmailSubject(string subject)
    {
        var trimmed = subject.Trim();
        return trimmed.Length <= 200 ? trimmed : trimmed[..200];
    }
}
