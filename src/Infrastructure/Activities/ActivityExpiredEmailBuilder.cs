using System.Net;
using System.Text;
using Cohestra.Application.Email;
using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityExpiredEmailBuilder
{
    public static (string Subject, string PlainBody, string HtmlBody) Build(
        string activityName,
        string schedule,
        string tenantName,
        DateTimeOffset archivedAtUtc)
    {
        var subject = $"Activity archived after event date — {activityName}";
        var archivedLabel = archivedAtUtc.UtcDateTime.ToString("MMMM d, yyyy 'at' h:mm tt 'UTC'");
        var year = archivedAtUtc.UtcDateTime.Year;

        var plain = new StringBuilder();
        EmailBrandHeaderTemplate.AppendPlainTextHeader(plain, "Activity Update");
        plain.AppendLine($"The published activity \"{activityName}\" was archived automatically.");
        plain.AppendLine();
        plain.AppendLine($"Schedule: {schedule}");
        plain.AppendLine($"Workspace: {tenantName}");
        plain.AppendLine($"Archived: {archivedLabel}");
        plain.AppendLine();
        plain.AppendLine("Public registration is now closed. Existing registrations and CRM records are unchanged.");
        plain.AppendLine("You can review this activity in your Activities list.");
        plain.AppendLine();
        plain.AppendLine(new string('-', 40));
        plain.AppendLine($"{EmailBrandHeaderTemplate.FooterBrandLine} © {year}");

        var logoInline = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        var logoUrl = logoInline is not null
            ? $"cid:{PlatformBrandAssets.LogoInlineContentId}"
            : null;
        var header = EmailBrandHeaderTemplate.BuildHtmlHeader(logoUrl, "Activity Update");
        var footer = EmailBrandHeaderTemplate.BuildHtmlFooter(
            year,
            "Public registration is now closed. Existing registrations and CRM records are unchanged.");

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
                          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:{EmailBrandHeaderTemplate.TextColor};">Activity archived automatically</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">
                            <strong style="color:{EmailBrandHeaderTemplate.TextColor};">{WebUtility.HtmlEncode(activityName)}</strong> has passed its scheduled date. We archived it so the public registration link no longer accepts new sign-ups.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 24px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8e4df;background-color:rgba(250,250,248,0.9);border-radius:12px;">
                            <tr>
                              <td style="padding:18px 20px;font-size:14px;line-height:1.6;color:{EmailBrandHeaderTemplate.TextColor};">
                                <p style="margin:0 0 8px;"><strong>Schedule:</strong> {WebUtility.HtmlEncode(schedule)}</p>
                                <p style="margin:0 0 8px;"><strong>Workspace:</strong> {WebUtility.HtmlEncode(tenantName)}</p>
                                <p style="margin:0;"><strong>Archived:</strong> {WebUtility.HtmlEncode(archivedLabel)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      {footer}
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return (subject, plain.ToString().TrimEnd(), html);
    }

    public static IReadOnlyList<EmailInlineAttachment>? BuildInlineAttachments()
    {
        var inline = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        return inline is null ? null : [inline];
    }
}
