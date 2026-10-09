using Cohestra.Application.Team;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Team;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Team;

public sealed class TeamInviteServiceTests
{
    [Fact]
    public void HashToken_IsDeterministic()
    {
        var a = TeamInviteService.HashToken("test-token");
        var b = TeamInviteService.HashToken("test-token");
        Assert.Equal(a, b);
        Assert.NotEqual(TeamInviteService.HashToken("other"), a);
    }

    [Fact]
    public void GenerateToken_ProducesDistinctValues()
    {
        var a = TeamInviteService.GenerateToken();
        var b = TeamInviteService.GenerateToken();
        Assert.NotEqual(a, b);
        Assert.True(a.Length >= 32);
    }

    [Fact]
    public void TenantInvite_IsPending_respects_revoke_expiry_accept()
    {
        var now = DateTimeOffset.UtcNow;
        var invite = new TenantInvite
        {
            ExpiresAt = now.AddDays(1),
        };

        Assert.True(invite.IsPending(now));

        invite.RevokedAt = now;
        Assert.False(invite.IsPending(now));

        invite.RevokedAt = null;
        invite.AcceptedAt = now;
        Assert.False(invite.IsPending(now));

        invite.AcceptedAt = null;
        invite.ExpiresAt = now.AddMinutes(-1);
        Assert.False(invite.IsPending(now));
    }

    [Fact]
    public async Task RemoveMember_Self_ReturnsValidation()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        SeedMembership(db, tenantId, adminId, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, adminId, adminId);

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Validation, result.Error);
        Assert.Contains("cannot remove yourself", result.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task RemoveMember_LastAdmin_ReturnsConflict()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var lastAdmin = Guid.NewGuid();
        var outsider = Guid.NewGuid();
        SeedMembership(db, tenantId, lastAdmin, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, outsider, lastAdmin);

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Conflict, result.Error);
        Assert.Contains("last workspace admin", result.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task RemoveMember_OtherAdminWhenActorAlsoAdmin_Succeeds()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var actor = Guid.NewGuid();
        var otherAdmin = Guid.NewGuid();
        SeedMembership(db, tenantId, actor, TenantMembershipRole.TenantAdmin);
        SeedMembership(db, tenantId, otherAdmin, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, actor, otherAdmin);

        Assert.True(result.Succeeded);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
        Assert.Equal(actor, Assert.Single(db.TenantMemberships).UserId);
    }

    private static void SeedMembership(
        CohestraDbContext db,
        Guid tenantId,
        Guid userId,
        TenantMembershipRole role)
    {
        db.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
    }

    private static TeamInviteService CreateService(CohestraDbContext db) =>
        new(
            db,
            userManager: null!,
            membershipService: null!,
            emailSender: null!,
            sendGridOptions: Options.Create(new Cohestra.Infrastructure.Email.SendGridSettings()),
            logger: NullLogger<TeamInviteService>.Instance);

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
