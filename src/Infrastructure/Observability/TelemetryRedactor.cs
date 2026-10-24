using System.Text.RegularExpressions;
using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Observability;

public static partial class TelemetryRedactor
{
    public const string Redacted = "[redacted]";

    private static readonly HashSet<string> ForbiddenKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "pwd",
        "passwd",
        "authorization",
        "cookie",
        "set-cookie",
        "jwt",
        "access_token",
        "accesstoken",
        "refresh_token",
        "refreshtoken",
        "id_token",
        "api_key",
        "apikey",
        "api-key",
        "secret",
        "clientsecret",
        "client_secret",
        "webhooksecret",
        "webhook_secret",
        "paddlesecret",
        "paddle_api_key",
        "clienttoken",
        "client_token",
        "sendgrid",
        "recaptcha",
        "recaptcha_secret",
        "secretkey",
        "connectionstring",
        "connection_string",
        "ssh",
        "ssh_key",
        "private_key",
        "privatekey",
        "otp",
        "otp_code",
        "card",
        "pan",
        "cvv",
        "email",
        "toemail",
        "to_email",
        "recipient",
        "phone",
        "phonenumber",
        "formanswer",
        "form_answer",
        "answers",
        "payloadjson",
        "payload_json",
        "http.request.body",
        "http.response.body",
        "db.query.parameter",
        "db.statement.parameter",
    };

    private static readonly HashSet<string> HighCardinalityKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "url.full",
        "url.query",
        "url.path",
        "http.url",
        "http.target",
        "http.request.body",
        "http.response.body",
        "user.email",
        "enduser.id",
        "client.address",
        "net.peer.ip",
        "net.sock.peer.addr",
        "http.request.header.authorization",
        "http.request.header.cookie",
        "db.query.parameter",
        "db.statement.parameter",
    };

    public static bool IsForbiddenKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        if (ForbiddenKeys.Contains(key))
        {
            return true;
        }

        var normalized = key.Replace('-', '_').Replace('.', '_');
        if (ForbiddenKeys.Contains(normalized))
        {
            return true;
        }

        return normalized.Contains("password", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("token", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("secret", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("apikey", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("authorization", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("payload", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("form_answer", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("query_parameter", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsHighCardinalityKey(string? key) =>
        !string.IsNullOrWhiteSpace(key) && HighCardinalityKeys.Contains(key);

    public static string? Redact(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var text = SshPrivateKey().Replace(value, Redacted);
        text = PlatformHealthDescriptionSanitizer.Sanitize(text) ?? string.Empty;
        text = PhoneNumber().Replace(text, Redacted);
        text = PaymentCard().Replace(text, Redacted);
        text = FormAnswersJson().Replace(text, $"\"answers\":{Redacted}");
        text = PayloadJson().Replace(text, $"\"PayloadJson\":{Redacted}");
        return text;
    }

    public static object? RedactValue(string key, object? value)
    {
        if (IsForbiddenKey(key) || IsHighCardinalityKey(key))
        {
            return Redacted;
        }

        if (key.Equals("db.statement", StringComparison.OrdinalIgnoreCase)
            || key.Equals("db.query.text", StringComparison.OrdinalIgnoreCase))
        {
            return RedactSql(value?.ToString());
        }

        if (value is string text)
        {
            return Redact(text);
        }

        return value;
    }

    public static string? RedactSql(string? sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return sql;
        }

        var withoutLiterals = SqlStringLiteral().Replace(sql, "'?'");
        return Redact(withoutLiterals);
    }

    public static bool ContainsForbiddenResidue(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        return JwtToken().IsMatch(text)
            || EmailAddress().IsMatch(text)
            || SshPrivateKey().IsMatch(text)
            || text.Contains("Password=", StringComparison.OrdinalIgnoreCase)
            || text.Contains("Bearer ", StringComparison.Ordinal)
            || text.Contains("ApiKey=", StringComparison.OrdinalIgnoreCase)
            || text.Contains("BEGIN ", StringComparison.Ordinal);
    }

    [GeneratedRegex(@"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----")]
    private static partial Regex SshPrivateKey();

    [GeneratedRegex(@"(?<!\d)(?:\+65[89]\d{7}|\+[1-9]\d{9,14}|[89]\d{7})(?!\d)")]
    private static partial Regex PhoneNumber();

    [GeneratedRegex(@"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")]
    private static partial Regex PaymentCard();

    [GeneratedRegex(@"""answers""\s*:\s*\{.*?\}", RegexOptions.Singleline)]
    private static partial Regex FormAnswersJson();

    [GeneratedRegex(@"""PayloadJson""\s*:\s*""(?:\\.|[^""])*""", RegexOptions.Singleline)]
    private static partial Regex PayloadJson();

    [GeneratedRegex(@"'([^']*)'")]
    private static partial Regex SqlStringLiteral();

    [GeneratedRegex(@"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")]
    private static partial Regex JwtToken();

    [GeneratedRegex(@"(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b")]
    private static partial Regex EmailAddress();
}
