using Cohestra.Application.Platform;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformTenantTimelineService(CohestraDbContext dbContext) : IPlatformTenantTimelineService
{
    public async Task<PlatformTenantResult<PlatformTenantTimelineResponse>> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(row => row.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<PlatformTenantTimelineResponse>.Fail(
                PlatformTenantError.NotFound,
                "Tenant not found.");
        }

        var observedAt = DateTimeOffset.UtcNow;

        var audits = await dbContext.PlatformAuditLogs.AsNoTracking()
            .Where(audit => audit.TenantId == tenantId)
            .OrderByDescending(audit => audit.CreatedAt)
            .ThenByDescending(audit => audit.Id)
            .Take(PlatformTenantTimelineComposer.PerSourceTake)
            .Select(audit => new
            {
                audit.Id,
                audit.Action,
                audit.Reason,
                audit.ActorUserId,
                audit.ActorEmail,
                audit.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var supportOpened = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Where(issue => issue.TenantId == tenantId)
            .OrderByDescending(issue => issue.CreatedAt)
            .ThenByDescending(issue => issue.Id)
            .Take(PlatformTenantTimelineComposer.PerSourceTake)
            .Select(issue => new
            {
                issue.Id,
                issue.IssueNumber,
                issue.Status,
                issue.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var supportReplies = await (
                from reply in dbContext.SupportIssueReplies.AsNoTracking()
                join issue in dbContext.IgnoreTenantFilters<SupportIssue>().AsNoTracking()
                    on reply.SupportIssueId equals issue.Id
                where issue.TenantId == tenantId
                orderby reply.CreatedAt descending, reply.Id descending
                select new
                {
                    reply.Id,
                    issue.IssueNumber,
                    reply.CreatedAt,
                })
            .Take(PlatformTenantTimelineComposer.PerSourceTake)
            .ToListAsync(cancellationToken);

        var outbox = await dbContext.OutboxMessages.AsNoTracking()
            .Where(message => message.TenantId == tenantId)
            .OrderByDescending(message => message.CreatedAt)
            .ThenByDescending(message => message.Id)
            .Take(PlatformTenantTimelineComposer.PerSourceTake)
            .Select(message => new
            {
                message.Id,
                message.MessageType,
                message.Status,
                message.AttemptCount,
                message.CreatedAt,
                message.ProcessedAt,
                message.DispatchedAt,
                message.LastError,
            })
            .ToListAsync(cancellationToken);

        var paddle = await dbContext.PaddleWebhookDeliveries.AsNoTracking()
            .Where(delivery => delivery.TenantId == tenantId)
            .OrderByDescending(delivery => delivery.ObservedAt)
            .ThenByDescending(delivery => delivery.Id)
            .Take(PlatformTenantTimelineComposer.PerSourceTake)
            .Select(delivery => new
            {
                delivery.Id,
                delivery.EventType,
                delivery.Disposition,
                delivery.HttpStatus,
                delivery.DetailSanitized,
                delivery.ObservedAt,
            })
            .ToListAsync(cancellationToken);

        var historical = new List<PlatformTenantTimelineItem>(
            audits.Count + supportOpened.Count + supportReplies.Count + outbox.Count + paddle.Count);

        historical.AddRange(audits.Select(audit => PlatformTenantTimelineComposer.MapAudit(
            audit.Id,
            audit.Action,
            audit.Reason,
            audit.ActorUserId,
            audit.ActorEmail,
            audit.CreatedAt)));
        historical.AddRange(supportOpened.Select(issue => PlatformTenantTimelineComposer.MapSupportOpened(
            issue.Id,
            issue.IssueNumber,
            issue.Status,
            issue.CreatedAt)));
        historical.AddRange(supportReplies.Select(reply => PlatformTenantTimelineComposer.MapSupportReply(
            reply.Id,
            reply.IssueNumber,
            reply.CreatedAt)));
        historical.AddRange(outbox.Select(message => PlatformTenantTimelineComposer.MapOutbox(
            message.Id,
            message.MessageType,
            message.Status,
            message.AttemptCount,
            message.CreatedAt,
            message.ProcessedAt,
            message.DispatchedAt,
            message.LastError)));
        historical.AddRange(paddle.Select(delivery => PlatformTenantTimelineComposer.MapPaddle(
            delivery.Id,
            delivery.EventType,
            delivery.Disposition,
            delivery.HttpStatus,
            delivery.DetailSanitized,
            delivery.ObservedAt)));

        var snapshot = PlatformTenantTimelineComposer.MapBillingSnapshot(
            tenant.Id,
            tenant.Plan,
            tenant.Status,
            tenant.BillingStatus,
            tenant.IsComplimentary,
            observedAt);

        var items = PlatformTenantTimelineComposer.Merge(
            historical.Prepend(snapshot),
            PlatformTenantTimelineComposer.MergedCap);

        var sources = new[]
        {
            PlatformTenantTimelineComposer.SourceStatus(
                PlatformTenantTimelineProvenance.PlatformAuditLogs,
                audits.Count),
            PlatformTenantTimelineComposer.SourceStatus(
                PlatformTenantTimelineProvenance.SupportIssues,
                supportOpened.Count + supportReplies.Count),
            PlatformTenantTimelineComposer.SourceStatus(
                PlatformTenantTimelineProvenance.OutboxMessages,
                outbox.Count),
            PlatformTenantTimelineComposer.SourceStatus(
                PlatformTenantTimelineProvenance.PaddleWebhookDeliveries,
                paddle.Count,
                missingInstrumentationWhenEmpty: true),
            PlatformTenantTimelineComposer.SourceStatus(
                PlatformTenantTimelineProvenance.TenantBillingSnapshot,
                1),
        };

        return PlatformTenantResult<PlatformTenantTimelineResponse>.Ok(
            new PlatformTenantTimelineResponse(
                tenant.Id,
                observedAt,
                historical.Count > 0,
                items,
                sources));
    }
}
