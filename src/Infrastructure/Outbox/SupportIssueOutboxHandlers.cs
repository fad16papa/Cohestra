using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Outbox;

public sealed class SupportIssueTechOutboxHandler(
    CohestraDbContext dbContext,
    SupportAttachmentService attachmentService,
    SupportIssueTechEmailBuilder emailBuilder,
    IEmailSender emailSender,
    ILogger<SupportIssueTechOutboxHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.SupportIssueTech;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<SupportIssueOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Support tech outbox payload is invalid.");

        var issue = await dbContext.SupportIssues
            .IgnoreQueryFilters()
            .Include(item => item.Attachments)
            .FirstOrDefaultAsync(item => item.Id == payload.IssueId, cancellationToken)
            ?? throw new InvalidOperationException($"Support issue {payload.IssueId} was not found.");

        var fileAttachments = new List<EmailFileAttachment>();
        foreach (var attachment in issue.Attachments)
        {
            var bytes = await attachmentService.ReadBytesAsync(attachment, cancellationToken);
            if (bytes is null || bytes.Length == 0)
            {
                logger.LogError(
                    "Support attachment {AttachmentId} for issue {IssueNumber} is missing on disk at {RelativePath}.",
                    attachment.Id,
                    issue.IssueNumber,
                    attachment.RelativePath);
                throw new InvalidOperationException(
                    $"Support attachment {attachment.FileName} for issue {issue.IssueNumber} could not be read.");
            }

            fileAttachments.Add(new EmailFileAttachment(
                attachment.FileName,
                attachment.ContentType,
                bytes));
        }

        var email = emailBuilder.Build(issue, fileAttachments);
        var sendResult = await emailSender.SendAsync(email, cancellationToken);
        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Support tech email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Sent support tech email for issue {IssueNumber}.",
            issue.IssueNumber);
    }
}

public sealed class SupportIssueConfirmationOutboxHandler(
    CohestraDbContext dbContext,
    SupportIssueConfirmationEmailBuilder emailBuilder,
    IEmailSender emailSender,
    ILogger<SupportIssueConfirmationOutboxHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.SupportIssueConfirmation;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<SupportIssueOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Support confirmation outbox payload is invalid.");

        var issue = await dbContext.SupportIssues
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == payload.IssueId, cancellationToken)
            ?? throw new InvalidOperationException($"Support issue {payload.IssueId} was not found.");

        var email = emailBuilder.Build(issue);
        var sendResult = await emailSender.SendAsync(email, cancellationToken);
        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Support confirmation email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Sent support confirmation email for issue {IssueNumber} to {OperatorEmail}.",
            issue.IssueNumber,
            issue.OperatorEmail);
    }
}

public sealed class SupportIssueFilerReplyOutboxHandler(
    CohestraDbContext dbContext,
    SupportIssueFilerNotificationEmailBuilder emailBuilder,
    IEmailSender emailSender,
    ILogger<SupportIssueFilerReplyOutboxHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.SupportIssueFilerReply;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<SupportIssueFilerOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Support filer reply outbox payload is invalid.");

        if (payload.ReplyId is not Guid replyId)
        {
            throw new InvalidOperationException("Support filer reply outbox payload is missing reply id.");
        }

        var issue = await dbContext.SupportIssues
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == payload.IssueId, cancellationToken)
            ?? throw new InvalidOperationException($"Support issue {payload.IssueId} was not found.");

        var reply = await dbContext.SupportIssueReplies
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == replyId && item.SupportIssueId == issue.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Support reply {replyId} was not found.");

        var email = emailBuilder.BuildReplyEmail(issue, reply);
        var sendResult = await emailSender.SendAsync(email, cancellationToken);
        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Support filer reply email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Sent support filer reply email for issue {IssueNumber}.",
            issue.IssueNumber);
    }
}

public sealed class SupportIssueFilerStatusOutboxHandler(
    CohestraDbContext dbContext,
    SupportIssueFilerNotificationEmailBuilder emailBuilder,
    IEmailSender emailSender,
    ILogger<SupportIssueFilerStatusOutboxHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.SupportIssueFilerStatus;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<SupportIssueFilerOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Support filer status outbox payload is invalid.");

        var issue = await dbContext.SupportIssues
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == payload.IssueId, cancellationToken)
            ?? throw new InvalidOperationException($"Support issue {payload.IssueId} was not found.");

        var email = emailBuilder.BuildStatusEmail(issue);
        var sendResult = await emailSender.SendAsync(email, cancellationToken);
        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Support filer status email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Sent support filer status email for issue {IssueNumber} ({Status}).",
            issue.IssueNumber,
            issue.Status);
    }
}
