using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Support;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Support;

public sealed class PlatformSupportIssueService(
    CohestraDbContext dbContext,
    SupportAttachmentService attachmentService,
    IOutboxPublisher outboxPublisher) : IPlatformSupportIssueService
{
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;
    private const int MaxPage = 10_000;
    private const int MaxSearchLength = 200;
    private const int MaxInternalNoteLength = 4000;
    private const int MaxReplyLength = 8000;

    public async Task<PlatformSupportIssueListResponse> ListAsync(
        string? search,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);
        var normalizedPage = page < 1 ? 1 : Math.Min(page, MaxPage);
        var maxSafePage = Math.Max(1, (int.MaxValue / normalizedPageSize) - 1);
        if (normalizedPage > maxSafePage)
        {
            normalizedPage = maxSafePage;
        }

        var query = dbContext.IgnoreTenantFilters<SupportIssue>().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > MaxSearchLength)
            {
                term = term[..MaxSearchLength];
            }

            var lowered = term.ToLowerInvariant();
            query = query.Where(issue =>
                issue.IssueNumber.ToLower().Contains(lowered)
                || issue.TenantSlug.ToLower().Contains(lowered)
                || issue.OperatorEmail.ToLower().Contains(lowered));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!TryParseStatus(status, out var parsedStatus))
            {
                throw new ArgumentException("Status filter is invalid.");
            }

            query = query.Where(issue => issue.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(issue => issue.CreatedAt)
            .ThenByDescending(issue => issue.IssueNumber)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .Select(issue => new PlatformSupportIssueListItemResponse(
                issue.Id,
                issue.IssueNumber,
                issue.TenantSlug,
                issue.OperatorEmail,
                issue.Subject,
                issue.Status.ToString(),
                issue.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PlatformSupportIssueListResponse(
            items,
            normalizedPage,
            normalizedPageSize,
            totalCount);
    }

    public async Task<PlatformSupportIssueDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var issue = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Include(item => item.Attachments.OrderBy(attachment => attachment.CreatedAt))
            .Include(item => item.Replies.OrderBy(reply => reply.CreatedAt))
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return issue is null ? null : MapDetail(issue);
    }

    public async Task<PlatformSupportIssueDetailResponse?> UpdateAsync(
        Guid id,
        UpdatePlatformSupportIssueRequest request,
        CancellationToken cancellationToken = default)
    {
        var issue = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .Include(item => item.Attachments.OrderBy(attachment => attachment.CreatedAt))
            .Include(item => item.Replies.OrderBy(reply => reply.CreatedAt))
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (issue is null)
        {
            return null;
        }

        var statusChanged = false;
        var noteChanged = false;
        SupportIssueStatus? previousStatus = issue.Status;

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!TryParseStatus(request.Status, out var parsedStatus))
            {
                throw new ArgumentException("Status is invalid.");
            }

            if (issue.Status != parsedStatus)
            {
                issue.Status = parsedStatus;
                statusChanged = true;
            }
        }

        if (request.InternalNote is not null)
        {
            var note = request.InternalNote.Trim();
            if (note.Length > MaxInternalNoteLength)
            {
                throw new ArgumentException($"Internal note must be {MaxInternalNoteLength} characters or fewer.");
            }

            var normalizedNote = note.Length == 0 ? null : note;
            if (issue.InternalNote != normalizedNote)
            {
                issue.InternalNote = normalizedNote;
                noteChanged = true;
            }
        }

        if (statusChanged || noteChanged)
        {
            if (statusChanged)
            {
                issue.UpdatedAt = DateTimeOffset.UtcNow;
            }

            if (statusChanged && ShouldEmailFilerOnStatus(issue.Status))
            {
                EnqueueFilerStatusEmail(issue);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return MapDetail(issue);
    }

    public async Task<PlatformSupportIssueDetailResponse?> AddReplyAsync(
        Guid id,
        AddPlatformSupportReplyRequest request,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
        {
            throw new ArgumentException("Reply body is required.");
        }

        var body = request.Body.Trim();
        if (body.Length == 0)
        {
            throw new ArgumentException("Reply body is required.");
        }

        if (body.Length > MaxReplyLength)
        {
            throw new ArgumentException($"Reply must be {MaxReplyLength} characters or fewer.");
        }

        var issue = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .Include(item => item.Attachments.OrderBy(attachment => attachment.CreatedAt))
            .Include(item => item.Replies.OrderBy(reply => reply.CreatedAt))
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (issue is null)
        {
            return null;
        }

        if (issue.Status is SupportIssueStatus.Resolved or SupportIssueStatus.Closed)
        {
            throw new InvalidOperationException("Cannot reply to a resolved or closed support issue.");
        }

        var now = DateTimeOffset.UtcNow;
        var reply = new SupportIssueReply
        {
            Id = Guid.CreateVersion7(),
            SupportIssueId = issue.Id,
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Body = body,
            CreatedAt = now,
        };

        issue.Replies.Add(reply);
        issue.Status = SupportIssueStatus.WaitingOnOperator;
        issue.UpdatedAt = now;

        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            TenantId = issue.TenantId,
            Action = PlatformAuditAction.SupportIssueReplyAdded,
            DetailsJson = JsonSerializer.Serialize(new
            {
                issueNumber = issue.IssueNumber,
                issueId = issue.Id,
                replyId = reply.Id,
            }),
            CreatedAt = now,
        });

        EnqueueFilerReplyEmail(issue, reply);

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapDetail(issue);
    }

    public async Task<int> GetOpenCountAsync(CancellationToken cancellationToken = default) =>
        await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .CountAsync(
                issue => issue.Status == SupportIssueStatus.Open
                    || issue.Status == SupportIssueStatus.InProgress
                    || issue.Status == SupportIssueStatus.WaitingOnOperator,
                cancellationToken);

    public async Task<PlatformSupportAttachmentFileResult?> GetAttachmentFileAsync(
        Guid issueId,
        Guid attachmentId,
        CancellationToken cancellationToken = default)
    {
        var attachment = await dbContext.IgnoreTenantFilters<SupportIssueAttachment>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == attachmentId && item.SupportIssueId == issueId,
                cancellationToken);

        if (attachment is null)
        {
            return null;
        }

        var bytes = await attachmentService.ReadBytesAsync(attachment, cancellationToken);
        if (bytes is null)
        {
            return null;
        }

        return new PlatformSupportAttachmentFileResult(
            bytes,
            attachment.ContentType,
            attachment.FileName);
    }

    private void EnqueueFilerReplyEmail(SupportIssue issue, SupportIssueReply reply)
    {
        var payload = JsonSerializer.Serialize(new SupportIssueFilerOutboxPayload(issue.Id, reply.Id));
        outboxPublisher.Enqueue(
            issue.TenantId,
            OutboxMessageTypes.SupportIssueFilerReply,
            payload,
            $"support:{issue.Id:D}:reply:{reply.Id:D}");
    }

    private void EnqueueFilerStatusEmail(SupportIssue issue)
    {
        var payload = JsonSerializer.Serialize(new SupportIssueFilerOutboxPayload(issue.Id, null));
        outboxPublisher.Enqueue(
            issue.TenantId,
            OutboxMessageTypes.SupportIssueFilerStatus,
            payload,
            $"support:{issue.Id:D}:status:{issue.Status}:{issue.UpdatedAt.UtcTicks}");
    }

    private static bool ShouldEmailFilerOnStatus(SupportIssueStatus status) =>
        status is SupportIssueStatus.WaitingOnOperator
            or SupportIssueStatus.Resolved
            or SupportIssueStatus.Closed;

    private static PlatformSupportIssueDetailResponse MapDetail(SupportIssue issue) =>
        new(
            issue.Id,
            issue.IssueNumber,
            issue.TenantId,
            issue.TenantSlug,
            issue.TenantName,
            issue.Plan.ToString(),
            issue.OperatorEmail,
            issue.OperatorDisplayName,
            issue.Subject,
            issue.Description,
            issue.Status.ToString(),
            issue.UserAgent,
            issue.InternalNote,
            issue.CreatedAt,
            issue.UpdatedAt,
            issue.Attachments
                .Select(attachment => new PlatformSupportAttachmentResponse(
                    attachment.Id,
                    attachment.FileName,
                    attachment.ContentType,
                    attachment.SizeBytes,
                    attachment.CreatedAt))
                .ToList(),
            issue.Replies
                .OrderBy(reply => reply.CreatedAt)
                .Select(reply => new PlatformSupportReplyResponse(
                    reply.Id,
                    reply.Body,
                    reply.ActorEmail,
                    reply.CreatedAt))
                .ToList());

    private static bool TryParseStatus(string raw, out SupportIssueStatus status)
    {
        status = default;
        var normalized = raw.Trim();
        if (normalized.Length == 0)
        {
            return false;
        }

        return Enum.TryParse(normalized, ignoreCase: true, out status)
            && Enum.IsDefined(status);
    }
}