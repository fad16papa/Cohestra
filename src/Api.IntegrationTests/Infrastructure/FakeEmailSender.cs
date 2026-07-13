using LeadGenerationCrm.Application.Email;

namespace LeadGenerationCrm.Api.IntegrationTests.Infrastructure;

public sealed class FakeEmailSender : IEmailSender
{
    public Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new EmailSendResult(
            Success: true,
            ProviderMessageId: "integration-test-message-id",
            FailureReason: null));
    }
}
