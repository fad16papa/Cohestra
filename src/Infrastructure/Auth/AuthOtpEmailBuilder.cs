using System.Net;
using System.Text;

namespace Cohestra.Infrastructure.Auth;

public sealed record AuthOtpEmailContent(string Subject, string PlainTextBody, string HtmlBody);

public static class AuthOtpEmailBuilder
{
    public static AuthOtpEmailContent BuildEmailVerification(string nickname, string code, int expiryMinutes)
    {
        var subject = "Verify your Activity Lead account";
        var greeting = string.IsNullOrWhiteSpace(nickname) ? "there" : nickname.Trim();
        var plainText = new StringBuilder()
            .AppendLine("Activity Lead")
            .AppendLine()
            .AppendLine($"Hi {greeting},")
            .AppendLine()
            .AppendLine($"Your verification code is: {code}")
            .AppendLine()
            .AppendLine($"This code expires in {expiryMinutes} minutes.")
            .AppendLine("If you did not create an account, you can ignore this email.")
            .AppendLine()
            .AppendLine("— Cohestra")
            .ToString();

        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#fafaf8;font-family:Inter,Segoe UI,sans-serif;color:#1a1714;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf8;padding:32px 16px;">
                <tr><td align="center">
                  <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
                    <tr><td style="padding:28px 28px 8px;">
                      <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#40916c;">Activity Lead</p>
                      <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.2;">Verify your email</h1>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6b6560;">Hi {WebUtility.HtmlEncode(greeting)}, enter this code to finish setting up your workspace.</p>
                    </td></tr>
                    <tr><td style="padding:0 28px 28px;">
                      <div style="text-align:center;padding:20px;border-radius:12px;background:#f4f7f5;border:1px solid #e8e4df;">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b6560;">Verification code</p>
                        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#2d6a4f;">{WebUtility.HtmlEncode(code)}</p>
                      </div>
                      <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b6560;">Expires in {expiryMinutes} minutes. If you did not request this, ignore this email.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        return new AuthOtpEmailContent(subject, plainText, html);
    }

    public static AuthOtpEmailContent BuildPasswordReset(string code, int expiryMinutes)
    {
        var subject = "Reset your Activity Lead password";
        var plainText = new StringBuilder()
            .AppendLine("Activity Lead")
            .AppendLine()
            .AppendLine($"Your password reset code is: {code}")
            .AppendLine()
            .AppendLine($"This code expires in {expiryMinutes} minutes.")
            .AppendLine("If you did not request a reset, you can ignore this email.")
            .AppendLine()
            .AppendLine("— Cohestra")
            .ToString();

        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#fafaf8;font-family:Inter,Segoe UI,sans-serif;color:#1a1714;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf8;padding:32px 16px;">
                <tr><td align="center">
                  <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e8e4df;border-radius:16px;overflow:hidden;">
                    <tr><td style="padding:28px;">
                      <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#40916c;">Activity Lead</p>
                      <h1 style="margin:16px 0 8px;font-size:24px;">Reset your password</h1>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6b6560;">Use this one-time code to choose a new password.</p>
                      <div style="text-align:center;padding:20px;border-radius:12px;background:#f4f7f5;border:1px solid #e8e4df;">
                        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#2d6a4f;">{WebUtility.HtmlEncode(code)}</p>
                      </div>
                      <p style="margin:20px 0 0;font-size:13px;color:#6b6560;">Expires in {expiryMinutes} minutes.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        return new AuthOtpEmailContent(subject, plainText, html);
    }
}
