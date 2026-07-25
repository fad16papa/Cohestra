using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantQueryFilterTests
{
    [Fact]
    public async Task Filter_hides_other_tenant_rows()
    {
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantA, "acme");

        await using var db = CreateDb(current);
        await SeedTenantsAsync(db, tenantA, tenantB);

        db.Activities.AddRange(
            CreateActivity(tenantA, "a-slug"),
            CreateActivity(tenantB, "b-slug"));
        await db.SaveChangesAsync();

        var visible = await db.Activities.AsNoTracking().Select(a => a.Slug).ToListAsync();
        Assert.Equal(["a-slug"], visible);
    }

    [Fact]
    public async Task Unresolved_tenant_matches_no_scoped_rows()
    {
        var current = new CurrentTenant(); // unresolved
        await using var db = CreateDb(current);

        var tenantA = Guid.CreateVersion7();
        await SeedTenantsAsync(db, tenantA);

        // Bypass filter to insert, then query with unresolved context.
        db.Activities.Add(CreateActivity(tenantA, "hidden"));
        await db.SaveChangesAsync();

        Assert.Empty(await db.Activities.AsNoTracking().ToListAsync());
        Assert.Single(await db.IgnoreTenantFilters<Activity>().AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task IgnoreTenantFilters_sees_all_tenants()
    {
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantA, "acme");

        await using var db = CreateDb(current);
        await SeedTenantsAsync(db, tenantA, tenantB);
        db.Activities.AddRange(
            CreateActivity(tenantA, "a"),
            CreateActivity(tenantB, "b"));
        await db.SaveChangesAsync();

        var all = await db.IgnoreTenantFilters<Activity>()
            .AsNoTracking()
            .Select(a => a.Slug)
            .OrderBy(s => s)
            .ToListAsync();

        Assert.Equal(["a", "b"], all);
    }

    [Fact]
    public async Task SaveChanges_stamps_ambient_tenant_when_empty()
    {
        var tenantA = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantA, "acme");

        await using var db = CreateDb(current);
        await SeedTenantsAsync(db, tenantA);

        db.Activities.Add(new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Stamp Me",
            Slug = "stamp-me",
            Category = "General",
            Schedule = "TBD",
            Location = "TBD",
            CommunityLabel = "Default",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var activity = await db.Activities.SingleAsync();
        Assert.Equal(tenantA, activity.TenantId);
    }

    private static CohestraDbContext CreateDb(ICurrentTenant currentTenant)
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options, currentTenant);
    }

    private static async Task SeedTenantsAsync(CohestraDbContext db, params Guid[] tenantIds)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var id in tenantIds)
        {
            db.Tenants.Add(new Tenant
            {
                Id = id,
                Slug = id.ToString("N")[..8],
                Name = "T",
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await db.SaveChangesAsync();
    }

    private static Activity CreateActivity(Guid tenantId, string slug) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = slug,
            Slug = slug,
            Category = "General",
            Schedule = "TBD",
            Location = "TBD",
            CommunityLabel = "Default",
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
}
