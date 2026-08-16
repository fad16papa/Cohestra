using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueOutboxHandlerTests
{
    [Fact]
    public async Task TechHandler_SendsEmailWithReplyToAndAttachments()
    {
        await using var dbContext = CreateDbContext();
        var issueId = Guid.CreateVersion7();
        var tenantId = Guid.CreateVersion7();
        var attachmentPath = Path.Combine("data", "support-test", issueId.ToString("D"), "shot.png");
        Directory.CreateDirectory(Path.GetDirectoryName(attachmentPath)!);
        await File.WriteAllBytesAsync(attachmentPath, [0x89, 0x50, 0x4E, 0x47]);

        dbContext.SupportIssues.Add(new SupportIssue
        {
            Id = issueId,
            TenantId = tenantId,
            IssueNumber = "SUP20260816000001",
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Login broken",
            Description = "Cannot sign in on mobile.",
            OperatorEmail = "operator@example.com",
            OperatorDisplayName = "Operator",
            TenantSlug = "demo",
            TenantName = "Demo Org",
            Plan = TenantPlan.Core,
            Attachments =
            [
                new SupportIssueAttachment
                {
                    Id = Guid.CreateVersion7(),
                    SupportIssueId = issueId,
                    FileName = "shot.png",
                    ContentType = "image/png",
                    SizeBytes = 4,
                    RelativePath = Path.Combine(issueId.ToString("D"), "shot.png").Replace('\\', '/'),
                    CreatedAt = DateTimeOffset.UtcNow,
                },
            ],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var sender = new CapturingEmailSender();
        var handler = new SupportIssueTechOutboxHandler(
            dbContext,
            new SupportAttachmentService(Options.Create(new SupportSettings
            {
                AttachmentStoragePath = Path.Combine("data", "support-test"),
            })),
            new SupportIssueTechEmailBuilder(Options.Create(new SupportSettings())),
            sender,
            NullLogger<SupportIssueTechOutboxHandler>.Instance);

        var message = new OutboxMessage
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            MessageType = OutboxMessageTypes.SupportIssueTech,
            PayloadJson = """{"IssueId":"00000000-0000-0000-0000-000000000001","IssueNumber":"SUP20260816000001"}""".Replace(
                "00000000-0000-0000-0000-000000000001",
                issueId.ToString("D")),
            Status = OutboxMessageStatus.Pending,
            AttemptCount = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            NextAttemptAt = DateTimeOffset.UtcNow,
        };
        dbContext.OutboxMessages.Add(message);
        await dbContext.SaveChangesAsync();

        await handler.HandleAsync(message);

        var sent = Assert.Single(sender.Messages);
        Assert.Equal("techsolutions@creativorare.com", sent.ToEmail);
        Assert.Equal("operator@example.com", sent.ReplyToEmail);
        Assert.NotNull(sent.FileAttachments);
        Assert.Single(sent.FileAttachments!);

        try
        {
            Directory.Delete(Path.Combine("data", "support-test"), recursive: true);
        }
        catch
        {
            // best effort cleanup
        }
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }

    private sealed class CapturingEmailSender : IEmailSender
    {
        public List<EmailMessage> Messages { get; } = [];

        public Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
            return Task.FromResult(new EmailSendResult(true, "test-id", null));
        }
    }
}
