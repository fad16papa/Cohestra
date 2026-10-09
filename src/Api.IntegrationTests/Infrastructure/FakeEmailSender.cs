using System.Collections.Concurrent;
using Cohestra.Application.Email;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentBag<EmailMessage> _sent = [];

    public IReadOnlyCollection<EmailMessage> Sent => _sent;

    public int SentCount => _sent.Count;

    public Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        _sent.Add(message);
        return Task.FromResult(new EmailSendResult(
            Success: true,
            ProviderMessageId: "integration-test-message-id",
            FailureReason: null));
    }
}
