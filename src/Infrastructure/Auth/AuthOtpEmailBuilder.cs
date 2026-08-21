using System.Net;
using System.Text;
using Cohestra.Application.Email;
using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Auth;

public sealed record AuthOtpEmailContent(
    string Subject,
    string PlainTextBody,
    string HtmlBody,
    IReadOnlyList<EmailInlineAttachment>? InlineAttachments = null);

public static class AuthOtpEmailBuilder
{
    private const string EmailVerificationLabel = "Email Verification";
    private const string PasswordResetLabel = "Password Reset";

    public static AuthOtpEmailContent BuildEmailVerification(string nickname, string code, int expiryMinutes)
    {
        var greeting = string.IsNullOrWhiteSpace(nickname) ? "there" : nickname.Trim();
        var (logoUrl, inlineAttachment) = EmailBrandHeaderTemplate.ResolveInlineLogo();
        var year = DateTime.UtcNow.Year;

        var plainText = BuildPlainText(
            EmailVerificationLabel,
            greeting,
            $"Your verification code is: {code}",
            expiryMinutes,
            "If you did not create an account, you can ignore this email.");

        var html = BuildHtml(
            logoUrl,
            EmailVerificationLabel,
            "Verify your email",
            $"Hi {WebUtility.HtmlEncode(greeting)}, enter this code to finish setting up your workspace.",
            "Verification code",
            code,
            expiryMinutes,
            "If you did not request this, ignore this email.",
            year);

        return new AuthOtpEmailContent(
            "Verify your Cohestra account",
            plainText,
            html,
            inlineAttachment is null ? null : [inlineAttachment]);
    }

    public static AuthOtpEmailContent BuildPasswordReset(string code, int expiryMinutes)
    {
        var (logoUrl, inlineAttachment) = EmailBrandHeaderTemplate.ResolveInlineLogo();
        var year = DateTime.UtcNow.Year;

        var plainText = BuildPlainText(
            PasswordResetLabel,
            greeting: null,
            $"Your password reset code is: {code}",
            expiryMinutes,
            "If you did not request a reset, you can ignore this email.");

        var html = BuildHtml(
            logoUrl,
            PasswordResetLabel,
            "Reset your password",
            "Use this one-time code to choose a new password.",
            "Reset code",
            code,
            expiryMinutes,
            "If you did not request a reset, ignore this email.",
            year);

        return new AuthOtpEmailContent(
            "Reset your Cohestra password",
            plainText,
            html,
            inlineAttachment is null ? null : [inlineAttachment]);
    }

    private static string BuildPlainText(
        string contextLabel,
        string? greeting,
        string codeLine,
        int expiryMinutes,
        string safetyNote)
    {
        var builder = new StringBuilder();
        EmailBrandHeaderTemplate.AppendPlainTextHeader(builder, contextLabel);

        if (!string.IsNullOrWhiteSpace(greeting))
        {
            builder.AppendLine($"Hi {greeting},");
            builder.AppendLine();
        }

        builder.AppendLine(codeLine);
        builder.AppendLine();
        builder.AppendLine($"This code expires in {expiryMinutes} minutes.");
        builder.AppendLine(safetyNote);
        builder.AppendLine();
        builder.AppendLine(new string('-', 40));
        builder.AppendLine($"{EmailBrandHeaderTemplate.FooterBrandLine} © {DateTime.UtcNow.Year}");
        return builder.ToString().TrimEnd();
    }

    private static string BuildHtml(
        string? logoUrl,
        string contextLabel,
        string title,
        string intro,
        string codeLabel,
        string code,
        int expiryMinutes,
        string safetyNote,
        int year)
    {
        var header = EmailBrandHeaderTemplate.BuildHtmlHeader(logoUrl, contextLabel);
        var footer = EmailBrandHeaderTemplate.BuildHtmlFooter(
            year,
            $"{safetyNote} This code expires in {expiryMinutes} minutes.");

        return $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>{WebUtility.HtmlEncode(title)}</title>
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
                          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:{EmailBrandHeaderTemplate.TextColor};">{WebUtility.HtmlEncode(title)}</h1>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:{EmailBrandHeaderTemplate.MutedTextColor};">{intro}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 24px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(45,106,79,0.25);background-color:rgba(45,106,79,0.06);border-radius:12px;">
                            <tr>
                              <td style="padding:20px;text-align:center;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:{EmailBrandHeaderTemplate.MutedTextColor};">{WebUtility.HtmlEncode(codeLabel)}</p>
                                <p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:{EmailBrandHeaderTemplate.PrimaryColor};">{WebUtility.HtmlEncode(code)}</p>
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
    }
}
