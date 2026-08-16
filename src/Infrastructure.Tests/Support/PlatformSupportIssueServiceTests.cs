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

        var byEmail = await service.ListAsync("bob@", status: null, page: 1, pageSize: 25);
        Assert.Single(byEmail.Items);
        Assert.Equal("SUP20260816000002", byEmail.Items[0].IssueNumber);

        var byStatus = await service.ListAsync(null, "Resolved", page: 1, pageSize: 25);
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
            new UpdatePlatformSupportIssueRequest("InProgress", "Needs billing check"));

        Assert.NotNull(updated);
        Assert.Equal("InProgress", updated!.Status);
        Assert.Equal("Needs billing check", updated.InternalNote);

        var persisted = await db.IgnoreTenantFilters<SupportIssue>().SingleAsync(item => item.Id == issue.Id);
        Assert.Equal(SupportIssueStatus.InProgress, persisted.Status);
        Assert.Equal("Needs billing check", persisted.InternalNote);
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

    private static PlatformSupportIssueService CreateService(CohestraDbContext db)
    {
        var attachmentService = new SupportAttachmentService(
            Options.Create(new SupportSettings { AttachmentStoragePath = Path.GetTempPath() }));
        return new PlatformSupportIssueService(db, attachmentService);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
