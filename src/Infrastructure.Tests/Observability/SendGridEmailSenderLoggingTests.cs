using Cohestra.Application.Email;
using Cohestra.Infrastructure.Email;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class SendGridEmailSenderLoggingTests
{
    [Theory]
    [InlineData("Production")]
    [InlineData("Development")]
    public void Send_failure_does_not_log_recipient_or_raw_body(string environmentName)
    {
        var logger = new ListLogger<SendGridEmailSender>();
        var environment = new FakeHostEnvironment { EnvironmentName = environmentName };

        SendGridEmailSender.LogSendFailure(logger, environment, 403);
        SendGridEmailSender.LogSendException(logger, environment, new InvalidOperationException("provider"));

        var dump = string.Join('\n', logger.Messages);
        Assert.DoesNotContain("ToEmail", dump, StringComparison.Ordinal);
        Assert.DoesNotContain("@", dump, StringComparison.Ordinal);
        Assert.DoesNotContain("Body", dump, StringComparison.Ordinal);
        Assert.DoesNotContain("{", dump, StringComparison.Ordinal);
        Assert.Contains("SendGrid send failed with status 403", dump, StringComparison.Ordinal);
    }

    [Fact]
    public void FormatSendGridFailure_does_not_return_raw_body_for_invalid_json()
    {
        const string rawBody = "{\"errors\":[],\"to\":\"customer@example.com\",\"secret\":\"SG.live.secret\"}";
        var formatted = SendGridEmailSender.FormatSendGridFailure(500, rawBody);

        Assert.Equal("SendGrid returned 500.", formatted);
        Assert.DoesNotContain("customer@example.com", formatted, StringComparison.Ordinal);
        Assert.DoesNotContain("SG.live.secret", formatted, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Null_sender_does_not_log_recipient_email()
    {
        var logger = new ListLogger<NullEmailSender>();
        var sender = new NullEmailSender(logger);

        await sender.SendAsync(new EmailMessage(
            "customer@example.com",
            "Customer",
            "Hello",
            "plain",
            "<p>plain</p>"));

        var dump = string.Join('\n', logger.Messages);
        Assert.DoesNotContain("customer@example.com", dump, StringComparison.Ordinal);
        Assert.DoesNotContain("ToEmail", dump, StringComparison.Ordinal);
    }
}
