using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Support;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportIssueService(
    CohestraDbContext dbContext,
    SupportIssueNumberGenerator numberGenerator,
    SupportAttachmentService attachmentService,
    IOutboxPublisher outboxPublisher,
    ILogger<SupportIssueService> logger) : ISupportIssueService
{
    private const int MaxIssueNumberAttempts = 3;
    private const int MaxOperatorDisplayNameLength = 200;
    private const int MaxUserAgentLength = 512;

    public async Task<SupportIssueCreateResult> CreateAsync(
        SupportIssueCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Subject);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Description);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.OperatorEmail);

        if (request.Subject.Length > 200)
        {
            throw new ArgumentException("Subject must be 200 characters or fewer.");
        }

        if (request.Description.Length > 5000)
        {
            throw new ArgumentException("Description must be 5000 characters or fewer.");
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {request.TenantId} was not found.");

        var now = DateTimeOffset.UtcNow;
        var operatorDisplayName = Truncate(
            string.IsNullOrWhiteSpace(request.OperatorDisplayName)
                ? request.OperatorEmail.Trim()
                : request.OperatorDisplayName.Trim(),
            MaxOperatorDisplayNameLength);
        var userAgent = string.IsNullOrWhiteSpace(request.UserAgent)
            ? null
            : Truncate(request.UserAgent.Trim(), MaxUserAgentLength);

        for (var attempt = 0; attempt < MaxIssueNumberAttempts; attempt++)
        {
            var issueId = Guid.CreateVersion7();
            var issueNumber = await numberGenerator.GenerateNextAsync(now, cancellationToken);

            try
            {
                var issue = new SupportIssue
                {
                    Id = issueId,
                    TenantId = request.TenantId,
                    IssueNumber = issueNumber,
                    SubmittedByUserId = request.OperatorUserId,
                    Subject = request.Subject.Trim(),
                    Description = request.Description.Trim(),
                    Status = SupportIssueStatus.Open,
                    OperatorEmail = request.OperatorEmail.Trim(),
                    OperatorDisplayName = operatorDisplayName,
                    TenantSlug = tenant.Slug,
                    TenantName = tenant.Name,
                    Plan = tenant.Plan,
                    UserAgent = userAgent,
                    CreatedAt = now,
                    UpdatedAt = now,
                };

                foreach (var file in request.Files)
                {
                    var attachment = await attachmentService.SaveAsync(
                        issueId,
                        file.Content,
                        file.FileName,
                        file.ContentType,
                        cancellationToken);
                    issue.Attachments.Add(attachment);
                }

                dbContext.SupportIssues.Add(issue);

                var techPayload = JsonSerializer.Serialize(new SupportIssueOutboxPayload(issueId, issueNumber));
                outboxPublisher.Enqueue(
                    request.TenantId,
                    OutboxMessageTypes.SupportIssueTech,
                    techPayload,
                    $"support:{issueId:D}:tech");

                outboxPublisher.Enqueue(
                    request.TenantId,
                    OutboxMessageTypes.SupportIssueConfirmation,
                    techPayload,
                    $"support:{issueId:D}:confirmation");

                await dbContext.SaveChangesAsync(cancellationToken);

                logger.LogInformation(
                    "Created support issue {IssueNumber} for tenant {TenantId} by operator {OperatorUserId}.",
                    issueNumber,
                    request.TenantId,
                    request.OperatorUserId);

                return new SupportIssueCreateResult(
                    issue.Id,
                    issue.IssueNumber,
                    issue.Status.ToString(),
                    issue.CreatedAt);
            }
            catch (DbUpdateException ex) when (IsIssueNumberUniqueViolation(ex) && attempt < MaxIssueNumberAttempts - 1)
            {
                dbContext.ChangeTracker.Clear();
                attachmentService.DeleteIssueAttachments(issueId);
                logger.LogWarning(
                    "Issue number collision for {IssueNumber}; retrying support issue create (attempt {Attempt}).",
                    issueNumber,
                    attempt + 2);
            }
            catch
            {
                dbContext.ChangeTracker.Clear();
                attachmentService.DeleteIssueAttachments(issueId);
                throw;
            }
        }

        throw new InvalidOperationException("Could not allocate a unique support issue number.");
    }

    public async Task<IReadOnlyList<SupportIssueSummary>> ListMineAsync(
        Guid tenantId,
        Guid operatorUserId,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        if (limit <= 0)
        {
            limit = 10;
        }

        limit = Math.Min(limit, 10);

        return await dbContext.SupportIssues
            .AsNoTracking()
            .Where(issue => issue.TenantId == tenantId && issue.SubmittedByUserId == operatorUserId)
            .OrderByDescending(issue => issue.CreatedAt)
            .Take(limit)
            .Select(issue => new SupportIssueSummary(
                issue.Id,
                issue.IssueNumber,
                issue.Subject,
                issue.Status.ToString(),
                issue.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private static bool IsIssueNumberUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
}
