using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformHealthDescriptionSanitizerTests
{
    [Fact]
    public void Strips_connection_string_and_redis_and_token_patterns()
    {
        var raw =
            "Failed Host=db.internal;Username=crm;Password=super-secret redis://:hunter2@cache:6379 Bearer abc.def.ghi ApiKey=SG.leak";
        var sanitized = PlatformHealthDescriptionSanitizer.Sanitize(raw);

        Assert.NotNull(sanitized);
        Assert.DoesNotContain("super-secret", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("abc.def.ghi", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("SG.leak", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("db.internal", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("Host=", sanitized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password=", sanitized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("redis://", sanitized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Bearer ", sanitized, StringComparison.Ordinal);
        Assert.Contains("[redacted]", sanitized, StringComparison.Ordinal);
    }

    [Fact]
    public void Truncates_to_200_and_keeps_safe_copy()
    {
        Assert.Equal(
            "Default tenant (Platform 0) is present.",
            PlatformHealthDescriptionSanitizer.Sanitize("Default tenant (Platform 0) is present."));
        Assert.Null(PlatformHealthDescriptionSanitizer.Sanitize("  "));
        Assert.Equal(200, PlatformHealthDescriptionSanitizer.Sanitize(new string('x', 250))!.Length);
    }

    [Theory]
    [InlineData("Send failed Password=hunter2", "hunter2")]
    [InlineData("Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")]
    [InlineData("provider ApiKey=SG.live.secret", "SG.live.secret")]
    [InlineData("Webhook Secret=paddle_live_abc", "paddle_live_abc")]
    [InlineData("WebhookSecret=pdl_ntfset_live", "pdl_ntfset_live")]
    [InlineData("ClientToken=test_checkout_token", "test_checkout_token")]
    [InlineData("Paddle-Signature=ts=1;h1=deadbeef", "deadbeef")]
    [InlineData("Npgsql Host=db;Username=crm;Password=s3cret", "s3cret")]
    [InlineData("cache rediss://:hunter2@redis:6379/0", "hunter2")]
    [InlineData("to customer@example.com body HELLO_BODY", "customer@example.com")]
    public void Redacts_secret_and_customer_fragments(string raw, string forbidden)
    {
        var sanitized = PlatformHealthDescriptionSanitizer.Sanitize(raw);
        Assert.NotNull(sanitized);
        Assert.DoesNotContain(forbidden, sanitized, StringComparison.Ordinal);
        Assert.True(sanitized!.Length <= 200);
    }

    [Fact]
    public void Redacts_before_truncating_so_late_secrets_do_not_survive()
    {
        var raw = new string('x', 180) + " Password=late-secret-value-should-not-leak";
        var sanitized = PlatformHealthDescriptionSanitizer.Sanitize(raw);
        Assert.NotNull(sanitized);
        Assert.True(sanitized!.Length <= 200);
        Assert.DoesNotContain("late-secret-value-should-not-leak", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("Password=", sanitized, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("[redacted]", sanitized, StringComparison.Ordinal);
    }

    [Fact]
    public void Strips_stack_frames_and_caps_long_exceptions()
    {
        var raw =
            "SendGrid failed" + Environment.NewLine
            + "   at Cohestra.Infrastructure.Outbox.Handlers.Send(message)" + Environment.NewLine
            + "   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()" + Environment.NewLine
            + new string('y', 400);
        var sanitized = PlatformHealthDescriptionSanitizer.Sanitize(raw);
        Assert.NotNull(sanitized);
        Assert.True(sanitized!.Length <= 200);
        Assert.DoesNotContain(" at ", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("ExceptionDispatchInfo", sanitized, StringComparison.Ordinal);
    }
}
