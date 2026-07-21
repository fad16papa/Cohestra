using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantMembershipServiceTests
{
    [Fact]
    public async Task Create_membership_accepts_admin_and_member_roles()
    {
        await using var db = CreateDb();
        await SeedDefaultTenantAsync(db);
        var service = new TenantMembershipService(db);
        var userId = Guid.NewGuid();

        var admin = await service.CreateMembershipAsync(
            userId,
            TenantIds.Default,
            TenantMembershipRole.TenantAdmin);

        Assert.True(admin.Succeeded);
        Assert.Equal(TenantMembershipRole.TenantAdmin, admin.Value!.Role);

        var otherTenant = Guid.CreateVersion7();
        db.Tenants.Add(new Tenant
        {
            Id = otherTenant,
            Slug = "other",
            Name = "Other",
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var member = await service.CreateMembershipAsync(
            userId,
            otherTenant,
            TenantMembershipRole.TenantMember);

        Assert.True(member.Succeeded);
        Assert.Equal(TenantMembershipRole.TenantMember, member.Value!.Role);
        Assert.Equal(2, await service.CountMembershipsForUserAsync(userId));
    }

    [Fact]
    public async Task Create_rejects_duplicate_user_tenant_pair()
    {
        await using var db = CreateDb();
        await SeedDefaultTenantAsync(db);
        var service = new TenantMembershipService(db);
        var userId = Guid.NewGuid();

        Assert.True((await service.CreateMembershipAsync(
            userId, TenantIds.Default, TenantMembershipRole.TenantAdmin)).Succeeded);

        var duplicate = await service.CreateMembershipAsync(
            userId, TenantIds.Default, TenantMembershipRole.TenantMember);

        Assert.False(duplicate.Succeeded);
        Assert.Equal(TenantMembershipError.Conflict, duplicate.Error);
    }

    [Fact]
    public async Task Create_rejects_unknown_tenant_and_undefined_role()
    {
        await using var db = CreateDb();
        await SeedDefaultTenantAsync(db);
        var service = new TenantMembershipService(db);

        var missingTenant = await service.CreateMembershipAsync(
            Guid.NewGuid(), Guid.NewGuid(), TenantMembershipRole.TenantAdmin);
        Assert.Equal(TenantMembershipError.NotFound, missingTenant.Error);

        var badRole = await service.CreateMembershipAsync(
            Guid.NewGuid(), TenantIds.Default, (TenantMembershipRole)99);
        Assert.Equal(TenantMembershipError.Validation, badRole.Error);
    }

    [Fact]
    public async Task DefaultTenantHasTenantAdmin_reflects_membership_not_identity_headcount()
    {
        await using var db = CreateDb();
        await SeedDefaultTenantAsync(db);
        var service = new TenantMembershipService(db);

        Assert.False(await service.DefaultTenantHasTenantAdminAsync());

        await service.CreateMembershipAsync(
            Guid.NewGuid(), TenantIds.Default, TenantMembershipRole.TenantMember);
        Assert.False(await service.DefaultTenantHasTenantAdminAsync());

        await service.CreateMembershipAsync(
            Guid.NewGuid(), TenantIds.Default, TenantMembershipRole.TenantAdmin);
        Assert.True(await service.DefaultTenantHasTenantAdminAsync());
    }

    [Fact]
    public async Task Ensure_is_idempotent_for_existing_pair()
    {
        await using var db = CreateDb();
        await SeedDefaultTenantAsync(db);
        var service = new TenantMembershipService(db);
        var userId = Guid.NewGuid();

        var first = await service.EnsureMembershipAsync(
            userId, TenantIds.Default, TenantMembershipRole.TenantAdmin);
        var second = await service.EnsureMembershipAsync(
            userId, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        Assert.True(first.Succeeded);
        Assert.True(second.Succeeded);
        Assert.Equal(first.Value!.Id, second.Value!.Id);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    private static async Task SeedDefaultTenantAsync(CohestraDbContext db)
    {
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
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
