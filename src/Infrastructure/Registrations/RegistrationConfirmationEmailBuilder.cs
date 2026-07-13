using System.Net;
using System.Text;

namespace Cohestra.Infrastructure.Registrations;

public sealed record RegistrationConfirmationEmailContent(
    string Subject,
    string PlainTextBody,
    string HtmlBody);

public sealed record RegistrationConfirmationEmailModel(
    string ParticipantName,
    string ActivityName,
    string Schedule,
    string Location,
    string CommunityLabel,
    string RegistrationNumber,
    string BrandName,
    string FooterLegalName,
    string WebsiteUrl,
    string? LogoUrl,
    string? HeroImageUrl);

internal static class RegistrationConfirmationEmailBuilder
{
    internal const string PrimaryColor = "#2d6a4f";
    internal const string BackgroundColor = "#fafaf8";
    internal const string TextColor = "#1a1714";
    internal const string MutedTextColor = "#6b6560";

    public static RegistrationConfirmationEmailContent Build(RegistrationConfirmationEmailModel model)
    {
        var subject = $"You're registered — {model.ActivityName}";
        var plainText = BuildPlainText(model);
        var html = BuildHtml(model);
        return new RegistrationConfirmationEmailContent(subject, plainText, html);
    }

    internal static string BuildPlainText(RegistrationConfirmationEmailModel model)
    {
        var builder = new StringBuilder();
        builder.AppendLine(model.BrandName);
        builder.AppendLine(new string('=', model.BrandName.Length));
        builder.AppendLine();
        builder.AppendLine("You're registered!");
        builder.AppendLine();
        builder.AppendLine($"We've saved your spot for {model.ActivityName}.");
        builder.AppendLine();
        builder.AppendLine($"Registration ID: {model.RegistrationNumber}");
        builder.AppendLine("Show this ID at check-in so we can validate your registration.");
        builder.AppendLine();

        if (!string.IsNullOrWhiteSpace(model.Schedule))
        {
            builder.AppendLine($"When: {model.Schedule}");
        }

        if (!string.IsNullOrWhiteSpace(model.Location))
        {
            builder.AppendLine($"Where: {model.Location}");
        }

        if (!string.IsNullOrWhiteSpace(model.CommunityLabel))
        {
            builder.AppendLine($"Community: {model.CommunityLabel}");
        }

        builder.AppendLine();
        builder.AppendLine("Save the date — we look forward to seeing you there.");
        builder.AppendLine();
        builder.AppendLine(new string('-', 40));
        builder.AppendLine(model.FooterLegalName);
        builder.AppendLine(model.WebsiteUrl);
        builder.AppendLine();
        builder.AppendLine("This email confirms your registration.");
        builder.AppendLine("Please do not reply — this inbox is not monitored.");
        return builder.ToString().TrimEnd();
    }

    internal static string BuildHtml(RegistrationConfirmationEmailModel model)
    {
        var encodedName = Encode(model.ParticipantName);
        var encodedActivity = Encode(model.ActivityName);
        var encodedSchedule = Encode(model.Schedule);
        var encodedLocation = Encode(model.Location);
        var encodedCommunity = Encode(model.CommunityLabel);
        var encodedRegNumber = Encode(model.RegistrationNumber);
        var encodedBrand = Encode(model.BrandName);
        var encodedLegal = Encode(model.FooterLegalName);
        var encodedWebsite = Encode(model.WebsiteUrl);
        var websiteHref = EncodeAttribute(model.WebsiteUrl);

        var headerBlock = string.IsNullOrWhiteSpace(model.LogoUrl)
            ? $"""<p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">{encodedBrand}</p>"""
            : $"""<img src="{EncodeAttribute(model.LogoUrl)}" alt="{encodedBrand}" width="200" style="display:block;max-width:200px;height:auto;margin:0 auto;" />""";

        var topBlock = string.IsNullOrWhiteSpace(model.HeroImageUrl)
            ? $"""
              <tr>
                <td style="background-color:#000000;padding:28px 24px;text-align:center;">
                  {headerBlock}
                </td>
              </tr>
              """
            : $"""
              <tr>
                <td style="padding:0;line-height:0;font-size:0;">
                  <img src="{EncodeAttribute(model.HeroImageUrl)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
                </td>
              </tr>
              """;

        var communityBlock = string.IsNullOrWhiteSpace(model.CommunityLabel)
            ? string.Empty
            : $"""<p style="margin:0 0 16px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{PrimaryColor};">{encodedCommunity}</p>""";

        var scheduleBlock = string.IsNullOrWhiteSpace(model.Schedule)
            ? string.Empty
            : $"""<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:{TextColor};">{encodedSchedule}</p>""";

        var locationBlock = string.IsNullOrWhiteSpace(model.Location)
            ? string.Empty
            : $"""<p style="margin:0;font-size:14px;color:{MutedTextColor};">{encodedLocation}</p>""";

        return $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>{Encode($"You're registered — {model.ActivityName}")}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#eceae6;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:{BackgroundColor};border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
                      {topBlock}
                      <tr>
                        <td style="padding:32px 28px 8px;text-align:center;">
                          <h1 style="margin:0 0 8px;font-size:28px;line-height:1.15;color:{TextColor};">You're registered!</h1>
                          <p style="margin:0;font-size:15px;line-height:1.5;color:{MutedTextColor};">
                            We've saved your spot for <strong style="color:{TextColor};">{encodedActivity}</strong>.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 24px;">
                          {communityBlock}
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(45,106,79,0.25);background-color:rgba(45,106,79,0.06);border-radius:12px;">
                            <tr>
                              <td style="padding:20px;text-align:center;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{MutedTextColor};">Registration ID</p>
                                <p style="margin:0 0 8px;font-family:Consolas,Monaco,monospace;font-size:20px;font-weight:700;letter-spacing:0.04em;color:{TextColor};">{encodedRegNumber}</p>
                                <p style="margin:0;font-size:14px;line-height:1.5;color:{MutedTextColor};">Show this ID at check-in so we can validate your registration.</p>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border:1px solid #e8e4df;background-color:rgba(250,250,248,0.8);border-radius:12px;">
                            <tr>
                              <td style="padding:16px 20px;">
                                {scheduleBlock}
                                {locationBlock}
                              </td>
                            </tr>
                          </table>
                          <p style="margin:24px 0 0;text-align:center;font-size:14px;color:{MutedTextColor};">
                            Save the date — we look forward to seeing you there.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 28px 28px;border-top:1px solid #e8e4df;text-align:center;">
                          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:{TextColor};">{encodedLegal}</p>
                          <p style="margin:0 0 12px;font-size:13px;">
                            <a href="{websiteHref}" style="color:{PrimaryColor};text-decoration:none;">{encodedWebsite}</a>
                          </p>
                          <p style="margin:0;font-size:12px;line-height:1.5;color:{MutedTextColor};">
                            This email confirms your registration.<br />
                            Please do not reply — this inbox is not monitored.
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

    private static string Encode(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);

    private static string EncodeAttribute(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);
}
