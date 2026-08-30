using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Cohestra.Application.Email;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Registrations;

internal sealed record RegistrationOperatorNotifyEmailModel(
    string ActivityName,
    string ParticipantName,
    string? Phone,
    string? Email,
    string RegistrationNumber,
    string RegistrationsUrl,
    IReadOnlyList<(string Label, string Value)> HiddenAnswers);

internal static class RegistrationOperatorNotifyEmailBuilder
{
    public static (string Subject, string PlainBody, string HtmlBody) Build(
        RegistrationOperatorNotifyEmailModel model)
    {
        var subjectParticipant = !string.IsNullOrWhiteSpace(model.ParticipantName)
            ? model.ParticipantName.Trim()
            : !string.IsNullOrWhiteSpace(model.Phone)
                ? model.Phone.Trim()
                : "New registrant";

        var subject = SanitizeEmailSubject(
            $"New registration — {model.ActivityName} — {subjectParticipant}");

        var plain = new StringBuilder();
        EmailBrandHeaderTemplate.AppendPlainTextHeader(plain, "New Registration");
        plain.AppendLine($"Someone registered for \"{SanitizePlainTextField(model.ActivityName)}\".");
        plain.AppendLine();
        plain.AppendLine($"Name: {FormatValue(model.ParticipantName)}");
        plain.AppendLine($"Phone: {FormatValue(model.Phone)}");
        plain.AppendLine($"Email: {FormatValue(model.Email)}");
        plain.AppendLine($"Registration #: {SanitizePlainTextField(model.RegistrationNumber)}");
        AppendHiddenAnswersPlain(plain, model.HiddenAnswers);
        plain.AppendLine();
        plain.AppendLine($"View registrations: {model.RegistrationsUrl}");
        plain.AppendLine();
        plain.AppendLine(new string('-', 40));
        plain.AppendLine($"{EmailBrandHeaderTemplate.FooterBrandLine} © {DateTimeOffset.UtcNow.Year}");

        var logoInline = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        var logoUrl = logoInline is not null
            ? $"cid:{PlatformBrandAssets.LogoInlineContentId}"
            : null;
        var header = EmailBrandHeaderTemplate.BuildHtmlHeader(logoUrl, "New Registration");
        var footer = EmailBrandHeaderTemplate.BuildHtmlFooter(
            DateTimeOffset.UtcNow.Year,
            "You received this because new-registration email notifications are enabled for your workspace.");

        var hiddenRows = BuildHiddenAnswersHtml(model.HiddenAnswers);
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
                          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:{EmailBrandHeaderTemplate.TextColor};">New registration</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">
                            Someone registered for <strong style="color:{EmailBrandHeaderTemplate.TextColor};">{WebUtility.HtmlEncode(model.ActivityName)}</strong>.
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
                                <p style="margin:0;"><strong>Registration #:</strong> {WebUtility.HtmlEncode(model.RegistrationNumber)}</p>
                                {hiddenRows}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 28px;">
                          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">
                            <a href="{WebUtility.HtmlEncode(model.RegistrationsUrl)}" style="color:{EmailBrandHeaderTemplate.PrimaryColor};font-weight:600;text-decoration:none;">View registrations</a>
                          </p>
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

    public static IReadOnlyList<EmailInlineAttachment>? BuildInlineAttachments()
    {
        var logo = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        return logo is null ? null : [logo];
    }

    internal static IReadOnlyList<(string Label, string Value)> BuildHiddenAnswers(
        ActivityFormSchema? schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        if (schema?.Fields is null)
        {
            return [];
        }

        return schema.Fields
            .Where(field => string.Equals(field.Type, FormFieldTypes.Hidden, StringComparison.Ordinal))
            .Select(field =>
            {
                answers.TryGetValue(field.Id, out var rawValue);
                var value = Clients.ClientRegistrationAnswerFormatter.FormatSingleFieldValue(field, rawValue);
                return (field.Label, value ?? string.Empty);
            })
            .Where(entry => !string.IsNullOrWhiteSpace(entry.Item2))
            .ToList();
    }

    private static void AppendHiddenAnswersPlain(
        StringBuilder plain,
        IReadOnlyList<(string Label, string Value)> hiddenAnswers)
    {
        if (hiddenAnswers.Count == 0)
        {
            return;
        }

        plain.AppendLine();
        plain.AppendLine("Campaign / hidden fields:");
        foreach (var (label, value) in hiddenAnswers)
        {
            plain.AppendLine($"{SanitizePlainTextField(label)}: {SanitizePlainTextField(value)}");
        }
    }

    private static string SanitizePlainTextField(string value) =>
        Regex.Replace(value.Trim(), @"[\r\n\u2028\u2029]+", " ", RegexOptions.CultureInvariant).Trim();

    private static string SanitizeEmailSubject(string subject) =>
        RegistrationConfirmationEmailBuilder.SanitizeEmailSubject(subject);

    private static string BuildHiddenAnswersHtml(IReadOnlyList<(string Label, string Value)> hiddenAnswers)
    {
        if (hiddenAnswers.Count == 0)
        {
            return string.Empty;
        }

        var builder = new StringBuilder();
        builder.Append("<p style=\"margin:16px 0 8px;font-size:13px;font-weight:600;color:")
            .Append(EmailBrandHeaderTemplate.TextColor)
            .Append(";\">Campaign / hidden fields</p>");

        foreach (var (label, value) in hiddenAnswers)
        {
            builder.Append("<p style=\"margin:0 0 6px;font-size:13px;line-height:1.5;color:")
                .Append(EmailBrandHeaderTemplate.MutedTextColor)
                .Append(";\"><strong>")
                .Append(WebUtility.HtmlEncode(label))
                .Append(":</strong> ")
                .Append(WebUtility.HtmlEncode(value))
                .Append("</p>");
        }

        return builder.ToString();
    }

    private static string FormatValue(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "Not provided" : SanitizePlainTextField(value);
}
