using LeadGenerationCrm.Infrastructure.Email;

namespace LeadGenerationCrm.Infrastructure.Tests.Email;

public class SendGridEmailSenderTests
{
    [Fact]
    public void FormatSendGridFailure_ExtractsMessageFromErrorPayload()
    {
        const string body =
            """
            {"errors":[{"message":"The from address does not match a verified Sender Identity.","field":"from"}]}
            """;

        var result = SendGridEmailSender.FormatSendGridFailure(403, body);

        Assert.Contains("verified Sender Identity", result);
        Assert.DoesNotContain("403", result);
    }

    [Fact]
    public void FormatSendGridFailure_FallsBackToStatusCodeForInvalidJson()
    {
        var result = SendGridEmailSender.FormatSendGridFailure(403, "not-json");

        Assert.Equal("SendGrid returned 403.", result);
    }
}
