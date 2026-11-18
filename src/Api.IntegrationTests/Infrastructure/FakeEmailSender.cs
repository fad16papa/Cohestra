using System.Collections.Concurrent;
using Cohestra.Application.Email;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentBag<EmailMessage> _sent = [];

    public IReadOnlyCollection<EmailMessage> Sent => _sent;

    public int SentCount => _sent.Count;

    public Func<EmailMessage, CancellationToken, Task>? BeforeSendAsync { get; set; }

    public async Task<EmailSendResult> SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken = default)
    {
        if (BeforeSendAsync is not null)
        {
            await BeforeSendAsync(message, cancellationToken);
        }

        _sent.Add(message);
        return new EmailSendResult(
            Success: true,
            ProviderMessageId: "integration-test-message-id",
            FailureReason: null);
    }
}
