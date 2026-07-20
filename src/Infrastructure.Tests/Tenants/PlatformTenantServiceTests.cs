using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class PlatformTenantServiceTests
{
    [Fact]
    public async Task Create_suspend_reactivate_archive_writes_audit_and_preserves_billing()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Acme Org", "acme-org", "Basic", "admin@acme.test"),
            actor);

        Assert.True(created.Succeeded);
        Assert.Equal(TenantStatus.Active.ToString(), created.Value!.Status);
        Assert.Equal(BillingStatus.Free.ToString(), created.Value.BillingStatus);

        // Force a non-Free billing status to prove Suspend does not touch it.
        var tenant = await db.Tenants.SingleAsync(t => t.Id == created.Value.Id);
        tenant.BillingStatus = BillingStatus.PastDue;
        await db.SaveChangesAsync();

        var suspended = await service.SuspendAsync(
            created.Value.Id,
            new SuspendTenantRequest("ToS abuse — break-glass freeze"),
            actor);

        Assert.True(suspended.Succeeded);
        Assert.Equal(TenantStatus.Suspended.ToString(), suspended.Value!.Status);
        Assert.Equal(BillingStatus.PastDue.ToString(), suspended.Value.BillingStatus);
        Assert.NotNull(suspended.Value.SuspendedAt);

        var reactivated = await service.ReactivateAsync(created.Value.Id, actor);
        Assert.True(reactivated.Succeeded);
        Assert.Equal(TenantStatus.Active.ToString(), reactivated.Value!.Status);
        Assert.Equal(BillingStatus.PastDue.ToString(), reactivated.Value.BillingStatus);
        Assert.Null(reactivated.Value.SuspendedAt);

        var archived = await service.ArchiveAsync(created.Value.Id, actor);
        Assert.True(archived.Succeeded);
        Assert.Equal(TenantStatus.Archived.ToString(), archived.Value!.Status);
        Assert.NotNull(archived.Value.ArchivedAt);

        var actions = await db.PlatformAuditLogs
            .Where(a => a.TenantId == created.Value.Id)
            .Select(a => a.Action)
            .ToListAsync();

        Assert.Contains(PlatformAuditAction.TenantCreated, actions);
        Assert.Contains(PlatformAuditAction.TenantSuspended, actions);
        Assert.Contains(PlatformAuditAction.TenantReactivated, actions);
        Assert.Contains(PlatformAuditAction.TenantArchived, actions);

        var suspendAudit = await db.PlatformAuditLogs.SingleAsync(a =>
            a.TenantId == created.Value.Id && a.Action == PlatformAuditAction.TenantSuspended);
        Assert.Equal("ToS abuse — break-glass freeze", suspendAudit.Reason);
    }

    [Fact]
    public async Task Create_rejects_reserved_and_duplicate_slug()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var reserved = await service.CreateAsync(
            new CreateTenantRequest("X", "default", "Basic", "a@b.co"),
            actor);
        Assert.False(reserved.Succeeded);
        Assert.Equal(PlatformTenantError.Validation, reserved.Error);

        var first = await service.CreateAsync(
            new CreateTenantRequest("One", "dup-slug", "Core", "a@b.co"),
            actor);
        Assert.True(first.Succeeded);

        var second = await service.CreateAsync(
            new CreateTenantRequest("Two", "dup-slug", "Core", "c@d.co"),
            actor);
        Assert.False(second.Succeeded);
        Assert.Equal(PlatformTenantError.Conflict, second.Error);
    }

    [Fact]
    public async Task Suspend_requires_reason_and_active_status()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Acme", "acme-2", "Basic", "admin@acme.test"),
            actor);

        var missingReason = await service.SuspendAsync(
            created.Value!.Id,
            new SuspendTenantRequest("  "),
            actor);
        Assert.Equal(PlatformTenantError.Validation, missingReason.Error);

        await service.SuspendAsync(created.Value.Id, new SuspendTenantRequest("freeze"), actor);
        var again = await service.SuspendAsync(created.Value.Id, new SuspendTenantRequest("again"), actor);
        Assert.Equal(PlatformTenantError.Conflict, again.Error);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
