using Cohestra.Infrastructure.Observability;
using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class TelemetryRedactorTests
{
    [Theory]
    [InlineData("password", "hunter2")]
    [InlineData("Password", "ChangeMe123!")]
    [InlineData("authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")]
    [InlineData("refresh_token", "refresh-secret-value")]
    [InlineData("api_key", "SG.live.secret")]
    [InlineData("webhook_secret", "pdl_ntfset_live")]
    [InlineData("client_token", "test_checkout_token")]
    [InlineData("recaptcha_secret", "recaptcha-secret")]
    [InlineData("connection_string", "Host=db;Username=crm;Password=s3cret")]
    [InlineData("ssh_key", "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----")]
    [InlineData("email", "customer@example.com")]
    [InlineData("phone", "+6591234567")]
    [InlineData("answers", "{\"name\":\"Ada\"}")]
    [InlineData("PayloadJson", "{\"ToEmail\":\"ada@example.com\"}")]
    public void Forbidden_keys_are_replaced_not_exported(string key, string value)
    {
        var redacted = TelemetryRedactor.RedactValue(key, value);

        Assert.Equal(TelemetryRedactor.Redacted, redacted);
        Assert.DoesNotContain(value, redacted?.ToString() ?? string.Empty, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Login failed Password=super-secret", "super-secret")]
    [InlineData("Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")]
    [InlineData("refresh_token=refresh-secret-value", "refresh-secret-value")]
    [InlineData("provider ApiKey=SG.live.secret", "SG.live.secret")]
    [InlineData("Paddle WebhookSecret=pdl_ntfset_live", "pdl_ntfset_live")]
    [InlineData("SendGrid ApiKey=SG.sendgrid.secret", "SG.sendgrid.secret")]
    [InlineData("reCAPTCHA Secret=recaptcha-secret", "recaptcha-secret")]
    [InlineData("Npgsql Host=db;Username=crm;Password=s3cret", "s3cret")]
    [InlineData("-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----", "BEGIN OPENSSH PRIVATE KEY")]
    [InlineData("to customer@example.com", "customer@example.com")]
    [InlineData("call +6591234567", "+6591234567")]
    [InlineData("{\"answers\":{\"q1\":\"secret-form-answer\"}}", "secret-form-answer")]
    [InlineData("{\"PayloadJson\":\"{\\\"ToEmail\\\":\\\"ada@example.com\\\"}\"}", "ada@example.com")]
    public void Forbidden_values_are_absent_after_redaction(string raw, string forbidden)
    {
        var redacted = TelemetryRedactor.Redact(raw);

        Assert.NotNull(redacted);
        Assert.DoesNotContain(forbidden, redacted, StringComparison.Ordinal);
        Assert.DoesNotContain(forbidden, redacted, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sql_parameter_literals_are_stripped()
    {
        var sql = "SELECT * FROM clients WHERE email = 'ada@example.com' AND phone = '+6591234567'";
        var redacted = TelemetryRedactor.RedactSql(sql);

        Assert.NotNull(redacted);
        Assert.DoesNotContain("ada@example.com", redacted, StringComparison.Ordinal);
        Assert.DoesNotContain("+6591234567", redacted, StringComparison.Ordinal);
        Assert.Contains("'?'", redacted, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("url.full")]
    [InlineData("url.query")]
    [InlineData("http.url")]
    [InlineData("http.request.body")]
    [InlineData("user.email")]
    [InlineData("client.address")]
    public void High_cardinality_keys_are_dropped(string key)
    {
        Assert.True(TelemetryRedactor.IsHighCardinalityKey(key));
        Assert.Equal(TelemetryRedactor.Redacted, TelemetryRedactor.RedactValue(key, "/clients?email=ada@example.com"));
    }

    [Fact]
    public void Safe_route_and_status_labels_are_kept()
    {
        Assert.False(TelemetryRedactor.IsForbiddenKey("http.route"));
        Assert.False(TelemetryRedactor.IsHighCardinalityKey("http.route"));
        Assert.Equal("/api/v1/admin/clients", TelemetryRedactor.RedactValue("http.route", "/api/v1/admin/clients"));
        Assert.Equal(200, TelemetryRedactor.RedactValue("http.response.status_code", 200));
    }

    [Fact]
    public void Otel_redaction_does_not_apply_health_description_length_cap()
    {
        var raw = new string('x', 250);
        var redacted = TelemetryRedactor.Redact(raw);

        Assert.Equal(250, redacted!.Length);
        Assert.Equal(200, PlatformHealthDescriptionSanitizer.Sanitize(raw)!.Length);
    }

    [Fact]
    public void Exception_message_key_is_forbidden()
    {
        Assert.True(TelemetryRedactor.IsForbiddenKey("exception.message"));
        Assert.Equal(TelemetryRedactor.Redacted, TelemetryRedactor.RedactValue("exception.message", "failed for customer@example.com"));
        Assert.Equal(TelemetryRedactor.Redacted, TelemetryRedactor.RedactValue("exception.stacktrace", "at Send(customer@example.com)"));
    }
}
