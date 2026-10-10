using Cohestra.Application.Outbox;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class PlatformSupportIssueServiceTests
{
    [Fact]
    public async Task ListAsync_searches_across_tenants_and_filters_status()
    {
        await using var db = CreateDb();
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;

        db.SupportIssues.AddRange(
            CreateIssue(tenantA, "SUP20260816000001", "alpha", "alice@example.com", SupportIssueStatus.Open, now),
            CreateIssue(tenantB, "SUP20260816000002", "beta", "bob@example.com", SupportIssueStatus.Resolved, now.AddMinutes(-1)));
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var byEmail = await service.ListAsync("bob@", status: null, severity: null, page: 1, pageSize: 25);
        Assert.Single(byEmail.Items);
        Assert.Equal("SUP20260816000002", byEmail.Items[0].IssueNumber);

        var byStatus = await service.ListAsync(null, "Resolved", null, page: 1, pageSize: 25);
        Assert.Single(byStatus.Items);
        Assert.Equal("beta", byStatus.Items[0].TenantSlug);
    }

    [Fact]
    public async Task UpdateAsync_changes_status_and_internal_note()
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var issue = CreateIssue(
            tenantId,
            "SUP20260816000003",
            "gamma",
            "carol@example.com",
            SupportIssueStatus.Open,
            now);
        db.SupportIssues.Add(issue);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var updated = await service.UpdateAsync(
            issue.Id,
            new UpdatePlatformSupportIssueRequest("InProgress", "Needs billing check"),
            Guid.CreateVersion7(),
            "ops@example.com");

        Assert.NotNull(updated);
        Assert.Equal("InProgress", updated!.Status);
        Assert.Equal("Needs billing check", updated.InternalNote);

        var persisted = await db.IgnoreTenantFilters<SupportIssue>().SingleAsync(item => item.Id == issue.Id);
        Assert.Equal(SupportIssueStatus.InProgress, persisted.Status);
        Assert.Equal("Needs billing check", persisted.InternalNote);
        Assert.True(persisted.UpdatedAt > now);
    }

    [Fact]
    public async Task UpdateAsync_internal_note_only_does_not_bump_updated_at()
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var issue = CreateIssue(
            tenantId,
            "SUP20260816000004",
            "delta",
            "dana@example.com",
            SupportIssueStatus.Resolved,
            now);
        db.SupportIssues.Add(issue);
        await db.SaveChangesAsync();
        var originalUpdatedAt = issue.UpdatedAt;

        var service = CreateService(db);
        var updated = await service.UpdateAsync(
            issue.Id,
            new UpdatePlatformSupportIssueRequest(null, "Follow up next week"),
            Guid.CreateVersion7(),
            "ops@example.com");

        Assert.NotNull(updated);
        Assert.Equal("Follow up next week", updated!.InternalNote);

        var persisted = await db.IgnoreTenantFilters<SupportIssue>().SingleAsync(item => item.Id == issue.Id);
        Assert.Equal(originalUpdatedAt, persisted.UpdatedAt);
    }

    [Fact]
    public async Task ListAsync_filters_severity_and_rejects_numeric_alias()
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var high = CreateIssue(tenantId, "SUP20261010000001", "high", "high@example.com", SupportIssueStatus.Open, now);
        high.Severity = SupportIssueSeverity.High;
        var low = CreateIssue(tenantId, "SUP20261010000002", "low", "low@example.com", SupportIssueStatus.Open, now.AddMinutes(-1));
        low.Severity = SupportIssueSeverity.Low;
        db.SupportIssues.AddRange(high, low);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var listed = await service.ListAsync(null, null, "high", 1, 25);
        Assert.Single(listed.Items);
        Assert.Equal("High", listed.Items[0].Severity);
        Assert.Equal("SUP20261010000001", listed.Items[0].IssueNumber);

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.ListAsync(null, null, "0", 1, 25));
        Assert.Contains("severity", ex.Message, StringComparison.OrdinalIgnoreCase);
        await Assert.ThrowsAsync<ArgumentException>(() => service.ListAsync(null, null, "Emergency", 1, 25));
    }

    [Fact]
    public async Task UpdateAsync_severity_only_writes_audit_and_skips_status_email()
    {
        await using var db = CreateDb();
        var publisher = new RecordingOutboxPublisher();
        var tenantId = Guid.CreateVersion7();
        var now = DateTimeOffset.UtcNow;
        var issue = CreateIssue(tenantId, "SUP20261010000003", "sev", "filer@example.com", SupportIssueStatus.Open, now);
        db.SupportIssues.Add(issue);
        await db.SaveChangesAsync();

        var actorId = Guid.CreateVersion7();
        var service = CreateService(db, publisher);
        var updated = await service.UpdateAsync(
            issue.Id,
            new UpdatePlatformSupportIssueRequest(null, null, "Critical"),
            actorId,
            "platform@cohestra.local");

        Assert.Equal("Critical", updated!.Severity);
        Assert.Equal("Open", updated.Status);
        Assert.True(updated.UpdatedAt > now);

        var persisted = await db.IgnoreTenantFilters<SupportIssue>().SingleAsync(item => item.Id == issue.Id);
        Assert.Equal(SupportIssueSeverity.Critical, persisted.Severity);

        var audit = Assert.Single(db.PlatformAuditLogs);
        Assert.Equal(PlatformAuditAction.SupportIssueSeverityChanged, audit.Action);
        Assert.Equal(actorId, audit.ActorUserId);
        Assert.Equal("platform@cohestra.local", audit.ActorEmail);
        Assert.Equal(tenantId, audit.TenantId);
        Assert.Contains("\"issueNumber\":\"SUP20261010000003\"", audit.DetailsJson);
        Assert.Contains("\"previousSeverity\":\"Unspecified\"", audit.DetailsJson);
        Assert.Contains("\"newSeverity\":\"Critical\"", audit.DetailsJson);
        Assert.DoesNotContain("filer@example.com", audit.DetailsJson);
        Assert.DoesNotContain("Something broke", audit.DetailsJson);
        Assert.Empty(publisher.Types);
    }

    [Fact]
    public async Task UpdateAsync_same_severity_writes_no_audit()
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        var issue = CreateIssue(tenantId, "SUP20261010000004", "same", "same@example.com", SupportIssueStatus.Open, DateTimeOffset.UtcNow);
        issue.Severity = SupportIssueSeverity.High;
        db.SupportIssues.Add(issue);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.UpdateAsync(
            issue.Id,
            new UpdatePlatformSupportIssueRequest(null, null, "High"),
            Guid.CreateVersion7(),
            "ops@example.com");

        Assert.Empty(db.PlatformAuditLogs);
        Assert.Equal(SupportIssueSeverity.High, (await db.IgnoreTenantFilters<SupportIssue>().SingleAsync()).Severity);
    }

    [Fact]
    public async Task UpdateAsync_combined_status_and_severity_emails_only_for_status()
    {
        await using var db = CreateDb();
        var publisher = new RecordingOutboxPublisher();
        var tenantId = Guid.CreateVersion7();
        var issue = CreateIssue(tenantId, "SUP20261010000005", "combo", "combo@example.com", SupportIssueStatus.Open, DateTimeOffset.UtcNow);
        db.SupportIssues.Add(issue);
        await db.SaveChangesAsync();

        var service = CreateService(db, publisher);
        var updated = await service.UpdateAsync(
            issue.Id,
            new UpdatePlatformSupportIssueRequest("Resolved", null, "High"),
            Guid.CreateVersion7(),
            "ops@example.com");

        Assert.Equal("Resolved", updated!.Status);
        Assert.Equal("High", updated.Severity);
        Assert.Single(publisher.Types);
        Assert.Contains("status", publisher.Types[0], StringComparison.OrdinalIgnoreCase);
        Assert.Single(db.PlatformAuditLogs.Where(row => row.Action == PlatformAuditAction.SupportIssueSeverityChanged));
    }

    private static SupportIssue CreateIssue(
        Guid tenantId,
        string issueNumber,
        string slug,
        string email,
        SupportIssueStatus status,
        DateTimeOffset createdAt) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            IssueNumber = issueNumber,
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Help",
            Description = "Something broke",
            Status = status,
            OperatorEmail = email,
            OperatorDisplayName = email,
            TenantSlug = slug,
            TenantName = slug,
            Plan = TenantPlan.Basic,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

    private static PlatformSupportIssueService CreateService(CohestraDbContext db, IOutboxPublisher? publisher = null)
    {
        var attachmentService = new SupportAttachmentService(
            Options.Create(new SupportSettings { AttachmentStoragePath = Path.GetTempPath() }));
        return new PlatformSupportIssueService(db, attachmentService, publisher ?? new RecordingOutboxPublisher());
    }

    private sealed class RecordingOutboxPublisher : IOutboxPublisher
    {
        public List<string> Types { get; } = [];

        public void Enqueue(Guid tenantId, string messageType, string payloadJson, string? dedupeKey = null, DateTimeOffset? nextAttemptAt = null)
        {
            Types.Add(messageType);
        }
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
