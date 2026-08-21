using System.Globalization;
using System.Net;
using System.Text;
using Cohestra.Application.Email;
using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityExpiringSoonEmailBuilder
{
    public static (string Subject, string PlainBody, string HtmlBody) Build(
        string activityName,
        string schedule,
        string tenantName,
        DateTimeOffset eventEndsAtUtc,
        string registrationTimeZoneId,
        int hoursBeforeEnd)
    {
        var subject = $"Registration closes soon — {activityName}";
        var closesLabel = FormatEventDayEndLabel(eventEndsAtUtc, registrationTimeZoneId);
        var year = eventEndsAtUtc.UtcDateTime.Year;
        var hoursLabel = FormatHoursBeforeEnd(hoursBeforeEnd);

        var plain = new StringBuilder();
        EmailBrandHeaderTemplate.AppendPlainTextHeader(plain, "Activity Reminder");
        plain.AppendLine($"Public registration for \"{activityName}\" closes at the end of its event day.");
        plain.AppendLine();
        plain.AppendLine($"Schedule: {schedule}");
        plain.AppendLine($"Workspace: {tenantName}");
        plain.AppendLine($"Registration closes: {closesLabel}");
        plain.AppendLine();
        plain.AppendLine(
            $"After that, the activity will be archived automatically and new sign-ups will stop. " +
            $"This reminder was sent about {hoursLabel} before registration closes.");
        plain.AppendLine("Review the activity in your Activities list if you need to extend or update it.");
        plain.AppendLine();
        plain.AppendLine(new string('-', 40));
        plain.AppendLine($"{EmailBrandHeaderTemplate.FooterBrandLine} © {year}");

        var logoInline = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        var logoUrl = logoInline is not null
            ? $"cid:{PlatformBrandAssets.LogoInlineContentId}"
            : null;
        var header = EmailBrandHeaderTemplate.BuildHtmlHeader(logoUrl, "Activity Reminder");
        var footer = EmailBrandHeaderTemplate.BuildHtmlFooter(
            year,
            "After the event day ends, the activity will be archived automatically and new sign-ups will stop.");

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
                          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:{EmailBrandHeaderTemplate.TextColor};">Registration closes soon</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">
                            <strong style="color:{EmailBrandHeaderTemplate.TextColor};">{WebUtility.HtmlEncode(activityName)}</strong> reaches the end of its scheduled event day in about {WebUtility.HtmlEncode(hoursLabel)}. Public registration will close, then the activity will archive automatically.
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
                                <p style="margin:0;"><strong>Event day ends:</strong> {WebUtility.HtmlEncode(closesLabel)}</p>
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

    private static string FormatEventDayEndLabel(
        DateTimeOffset eventEndsAtUtc,
        string registrationTimeZoneId)
    {
        var timeZone = ActivityScheduleTimeZone.Resolve(registrationTimeZoneId);
        var localEnd = TimeZoneInfo.ConvertTime(eventEndsAtUtc, timeZone);
        return localEnd.ToString("MMMM d, yyyy 'at' h:mm tt", CultureInfo.InvariantCulture)
            + $" ({registrationTimeZoneId})";
    }

    private static string FormatHoursBeforeEnd(int hoursBeforeEnd) =>
        hoursBeforeEnd == 1 ? "1 hour" : $"{hoursBeforeEnd} hours";
}
