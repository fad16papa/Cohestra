using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
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

    [Fact]
    public async Task Suspend_and_archive_reject_default_tenant()
    {
        await using var db = CreateDb();
        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var suspend = await service.SuspendAsync(
            TenantIds.Default,
            new SuspendTenantRequest("should fail"),
            actor);
        Assert.Equal(PlatformTenantError.Conflict, suspend.Error);
        Assert.Contains("default tenant", suspend.Detail!, StringComparison.OrdinalIgnoreCase);

        var archive = await service.ArchiveAsync(TenantIds.Default, actor);
        Assert.Equal(PlatformTenantError.Conflict, archive.Error);
    }

    [Fact]
    public async Task Create_rejects_numeric_plan_and_invalid_email()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var numericPlan = await service.CreateAsync(
            new CreateTenantRequest("Acme", "acme-plan", "0", "admin@acme.test"),
            actor);
        Assert.Equal(PlatformTenantError.Validation, numericPlan.Error);

        var badEmail = await service.CreateAsync(
            new CreateTenantRequest("Acme", "acme-email", "Basic", "not-an-email"),
            actor);
        Assert.Equal(PlatformTenantError.Validation, badEmail.Error);
    }

    [Fact]
    public async Task Archive_from_suspended_keeps_SuspendedAt()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Acme", "acme-keep-suspend", "Basic", "admin@acme.test"),
            actor);
        await service.SuspendAsync(created.Value!.Id, new SuspendTenantRequest("freeze"), actor);

        var archived = await service.ArchiveAsync(created.Value.Id, actor);
        Assert.True(archived.Succeeded);
        Assert.NotNull(archived.Value!.SuspendedAt);
        Assert.NotNull(archived.Value.ArchivedAt);
    }

    [Fact]
    public async Task List_searches_slug_or_name_and_clamps_pagination()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        await service.CreateAsync(
            new CreateTenantRequest("Northside Runners", "northside-runners", "Basic", "a@b.co"),
            actor);
        await service.CreateAsync(
            new CreateTenantRequest("South Club", "south-club", "Core", "c@d.co"),
            actor);
        await service.CreateAsync(
            new CreateTenantRequest("Eastside FC", "eastside-fc", "Pro", "e@f.co"),
            actor);

        var bySlug = await service.ListAsync("northside", page: 0, pageSize: 0);
        Assert.Equal(1, bySlug.TotalCount);
        Assert.Equal(1, bySlug.Page);
        Assert.Equal(25, bySlug.PageSize);
        Assert.Equal("northside-runners", bySlug.Items[0].Slug);

        var byName = await service.ListAsync("Club", 1, 25);
        Assert.Equal(1, byName.TotalCount);
        Assert.Equal("south-club", byName.Items[0].Slug);

        var oversized = await service.ListAsync(null, 1, 500);
        Assert.Equal(3, oversized.TotalCount);
        Assert.Equal(100, oversized.PageSize);

        var hugePage = await service.ListAsync(null, int.MaxValue, 100);
        Assert.True(hugePage.Page < int.MaxValue);
        Assert.True(hugePage.Page >= 1);

        var longSearch = new string('a', 500);
        var truncatedSearch = await service.ListAsync(longSearch, 1, 25);
        Assert.Equal(0, truncatedSearch.TotalCount);
    }

    [Fact]
    public async Task List_includes_activity_and_client_counts_per_tenant()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var first = await service.CreateAsync(
            new CreateTenantRequest("Alpha Org", "alpha-org", "Basic", "a@b.co"),
            actor);
        var second = await service.CreateAsync(
            new CreateTenantRequest("Beta Org", "beta-org", "Basic", "c@d.co"),
            actor);

        var now = DateTimeOffset.UtcNow;
        db.Activities.AddRange(
            new Activity
            {
                Id = Guid.NewGuid(),
                TenantId = first.Value!.Id,
                Name = "A1",
                Slug = "a1",
                Category = "Test",
                Schedule = "Sat",
                Location = "Court",
                CommunityLabel = "C",
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Activity
            {
                Id = Guid.NewGuid(),
                TenantId = first.Value.Id,
                Name = "A2",
                Slug = "a2",
                Category = "Test",
                Schedule = "Sun",
                Location = "Court",
                CommunityLabel = "C",
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Activity
            {
                Id = Guid.NewGuid(),
                TenantId = second.Value!.Id,
                Name = "B1",
                Slug = "b1",
                Category = "Test",
                Schedule = "Mon",
                Location = "Court",
                CommunityLabel = "C",
                CreatedAt = now,
                UpdatedAt = now,
            });
        db.Clients.AddRange(
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = first.Value.Id,
                FullName = "Client One",
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = second.Value.Id,
                FullName = "Client Two",
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = second.Value.Id,
                FullName = "Client Three",
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = second.Value.Id,
                FullName = "Client Four",
                CreatedAt = now,
                UpdatedAt = now,
            });
        await db.SaveChangesAsync();

        var list = await service.ListAsync(null, 1, 25);
        var alpha = list.Items.Single(i => i.Slug == "alpha-org");
        var beta = list.Items.Single(i => i.Slug == "beta-org");
        Assert.Equal(2, alpha.ActivityCount);
        Assert.Equal(1, alpha.ClientCount);
        Assert.Equal(1, beta.ActivityCount);
        Assert.Equal(3, beta.ClientCount);
    }

    [Fact]
    public async Task GetById_returns_audits_newest_first_and_unknown_is_not_found()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Audit Org", "audit-org", "Basic", "a@b.co"),
            actor);
        await service.SuspendAsync(created.Value!.Id, new SuspendTenantRequest("freeze"), actor);
        await service.ReactivateAsync(created.Value.Id, actor);

        var detail = await service.GetByIdAsync(created.Value.Id);
        Assert.True(detail.Succeeded);
        Assert.Equal("audit-org", detail.Value!.Tenant.Slug);
        Assert.True(detail.Value.RecentAudits.Count >= 3);
        for (var i = 1; i < detail.Value.RecentAudits.Count; i++)
        {
            Assert.True(
                detail.Value.RecentAudits[i - 1].CreatedAt >= detail.Value.RecentAudits[i].CreatedAt);
        }

        var missing = await service.GetByIdAsync(Guid.NewGuid());
        Assert.Equal(PlatformTenantError.NotFound, missing.Error);
    }

    [Fact]
    public async Task SetComplimentary_sets_plan_free_and_audits_clear_preserves_plan()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Pilot Org", "pilot-org", "Basic", "pilot@acme.test"),
            actor);
        Assert.False(created.Value!.IsComplimentary);

        var tenant = await db.Tenants.SingleAsync(t => t.Id == created.Value.Id);
        tenant.BillingStatus = BillingStatus.PastDue;
        tenant.StripeCustomerId = "cus_keep";
        tenant.StripeSubscriptionId = "sub_keep";
        await db.SaveChangesAsync();

        var set = await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(true, "Pro", "Pilot cohort"),
            actor);

        Assert.True(set.Succeeded);
        Assert.True(set.Value!.IsComplimentary);
        Assert.Equal(TenantPlan.Pro.ToString(), set.Value.Plan);
        Assert.Equal(BillingStatus.Free.ToString(), set.Value.BillingStatus);

        tenant = await db.Tenants.SingleAsync(t => t.Id == created.Value.Id);
        Assert.Equal("cus_keep", tenant.StripeCustomerId);
        Assert.Equal("sub_keep", tenant.StripeSubscriptionId);

        var setAudit = await db.PlatformAuditLogs.SingleAsync(a =>
            a.TenantId == created.Value.Id && a.Action == PlatformAuditAction.ComplimentarySet);
        Assert.Equal("Pilot cohort", setAudit.Reason);
        Assert.Contains("FR-23", setAudit.DetailsJson!, StringComparison.Ordinal);

        var cleared = await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(false, null, "Converting to paid"),
            actor);

        Assert.True(cleared.Succeeded);
        Assert.False(cleared.Value!.IsComplimentary);
        Assert.Equal(TenantPlan.Pro.ToString(), cleared.Value.Plan);
        Assert.Equal(BillingStatus.Free.ToString(), cleared.Value.BillingStatus);

        var clearAudit = await db.PlatformAuditLogs.SingleAsync(a =>
            a.TenantId == created.Value.Id && a.Action == PlatformAuditAction.ComplimentaryCleared);
        Assert.Equal("Converting to paid", clearAudit.Reason);
        Assert.Contains("FR-19", clearAudit.DetailsJson!, StringComparison.Ordinal);

        var detail = await service.GetByIdAsync(created.Value.Id);
        Assert.False(detail.Value!.Tenant.IsComplimentary);

        var list = await service.ListAsync("pilot-org", 1, 25);
        Assert.False(list.Items[0].IsComplimentary);
    }

    [Fact]
    public async Task SetComplimentary_rejects_invalid_plan_archived_default_and_clear_when_not_set()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Comp Rules", "comp-rules", "Basic", "a@b.co"),
            actor);

        var enterprise = await service.SetComplimentaryAsync(
            created.Value!.Id,
            new SetComplimentaryRequest(true, "Enterprise", null),
            actor);
        Assert.Equal(PlatformTenantError.Validation, enterprise.Error);

        var numeric = await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(true, "1", null),
            actor);
        Assert.Equal(PlatformTenantError.Validation, numeric.Error);

        var clearNotSet = await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(false, null, null),
            actor);
        Assert.Equal(PlatformTenantError.Conflict, clearNotSet.Error);

        await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(true, "Core", null),
            actor);
        await service.ArchiveAsync(created.Value.Id, actor);

        var onArchived = await service.SetComplimentaryAsync(
            created.Value.Id,
            new SetComplimentaryRequest(false, null, null),
            actor);
        Assert.Equal(PlatformTenantError.Conflict, onArchived.Error);
        Assert.Contains("Archived", onArchived.Detail!, StringComparison.OrdinalIgnoreCase);

        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var onDefault = await service.SetComplimentaryAsync(
            TenantIds.Default,
            new SetComplimentaryRequest(true, "Basic", null),
            actor);
        Assert.Equal(PlatformTenantError.Conflict, onDefault.Error);
        Assert.Contains("default tenant", onDefault.Detail!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Create_with_complimentary_forces_free_and_rejects_enterprise()
    {
        await using var db = CreateDb();
        var service = new PlatformTenantService(db);
        var actor = Guid.NewGuid();

        var created = await service.CreateAsync(
            new CreateTenantRequest("Sponsored Create", "sponsored-create", "Core", "s@c.co", IsComplimentary: true),
            actor);

        Assert.True(created.Succeeded);
        Assert.True(created.Value!.IsComplimentary);
        Assert.Equal(TenantPlan.Core.ToString(), created.Value.Plan);
        Assert.Equal(BillingStatus.Free.ToString(), created.Value.BillingStatus);

        var enterprise = await service.CreateAsync(
            new CreateTenantRequest("Bad Comp", "bad-comp", "Enterprise", "e@c.co", IsComplimentary: true),
            actor);
        Assert.Equal(PlatformTenantError.Validation, enterprise.Error);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
