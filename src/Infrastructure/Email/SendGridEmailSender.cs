using System.Text.Json;
using Cohestra.Application.Email;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Cohestra.Infrastructure.Email;

public sealed class SendGridEmailSender(
    IOptions<SendGridSettings> options,
    ILogger<SendGridEmailSender> logger) : IEmailSender
{
    public async Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var apiKey = settings.ApiKey?.Trim();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new EmailSendResult(false, null, "SendGrid API key is not configured.");
        }

        var fromEmail = message.FromEmail?.Trim();
        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            fromEmail = settings.FromEmail?.Trim();
        }

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            return new EmailSendResult(false, null, "SendGrid sender email is not configured.");
        }

        var fromName = message.FromName?.Trim();
        if (string.IsNullOrWhiteSpace(fromName))
        {
            fromName = settings.FromName?.Trim();
        }

        var client = new SendGridClient(apiKey);
        var from = new EmailAddress(fromEmail, fromName);
        var to = new EmailAddress(message.ToEmail, message.ToName);
        var mail = MailHelper.CreateSingleEmail(
            from,
            to,
            message.Subject,
            message.PlainTextBody,
            message.HtmlBody);

        if (settings.UseSandbox)
        {
            mail.SetSandBoxMode(true);
        }

        try
        {
            var response = await client.SendEmailAsync(mail, cancellationToken);
            var responseBody = await response.Body.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var messageId = response.Headers.TryGetValues("X-Message-Id", out var values)
                    ? values.FirstOrDefault()
                    : null;

                return new EmailSendResult(true, messageId, null);
            }

            var failureReason = FormatSendGridFailure((int)response.StatusCode, responseBody);

            logger.LogWarning(
                "SendGrid send failed for {ToEmail} with status {StatusCode}: {Body}",
                message.ToEmail,
                (int)response.StatusCode,
                responseBody);

            return new EmailSendResult(false, null, failureReason);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "SendGrid send failed for {ToEmail}", message.ToEmail);
            return new EmailSendResult(false, null, ex.Message);
        }
    }

    internal static string FormatSendGridFailure(int statusCode, string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return $"SendGrid returned {statusCode}.";
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("errors", out var errors) &&
                errors.ValueKind == JsonValueKind.Array)
            {
                var messages = errors.EnumerateArray()
                    .Select(error =>
                        error.TryGetProperty("message", out var message) &&
                        message.ValueKind == JsonValueKind.String
                            ? message.GetString()
                            : null)
                    .Where(message => !string.IsNullOrWhiteSpace(message))
                    .ToList();

                if (messages.Count > 0)
                {
                    var combined = string.Join(" ", messages);
                    if (statusCode is 401 &&
                        combined.Contains("authorization grant", StringComparison.OrdinalIgnoreCase))
                    {
                        return $"{combined} Create a new API key in SendGrid → Settings → API Keys, update SendGrid__ApiKey in .env, and recreate the API container.";
                    }

                    return combined;
                }
            }
        }
        catch (JsonException)
        {
            // fall through to generic message
        }

        return $"SendGrid returned {statusCode}.";
    }
}
