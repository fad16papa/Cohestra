using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cohestra.Infrastructure.Tenants;

public sealed class TenantMembershipService(CohestraDbContext dbContext) : ITenantMembershipService
{
    public Task<bool> DefaultTenantHasTenantAdminAsync(CancellationToken cancellationToken = default) =>
        dbContext.TenantMemberships.AnyAsync(
            m => m.TenantId == TenantIds.Default && m.Role == TenantMembershipRole.TenantAdmin,
            cancellationToken);

    public Task<int> CountMembershipsForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        dbContext.TenantMemberships.CountAsync(m => m.UserId == userId, cancellationToken);

    public async Task<TenantMembershipResult> EnsureMembershipAsync(
        Guid userId,
        Guid tenantId,
        TenantMembershipRole role,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(role))
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Validation,
                "Membership role must be TenantAdmin or TenantMember.");
        }

        var existing = await dbContext.TenantMemberships.FirstOrDefaultAsync(
            m => m.UserId == userId && m.TenantId == tenantId,
            cancellationToken);

        if (existing is not null)
        {
            return TenantMembershipResult.Ok(existing);
        }

        return await CreateMembershipAsync(userId, tenantId, role, cancellationToken);
    }

    public async Task<TenantMembershipResult> CreateMembershipAsync(
        Guid userId,
        Guid tenantId,
        TenantMembershipRole role,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || tenantId == Guid.Empty)
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Validation,
                "UserId and TenantId are required.");
        }

        if (!Enum.IsDefined(role))
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Validation,
                "Membership role must be TenantAdmin or TenantMember.");
        }

        var tenantExists = await dbContext.Tenants.AnyAsync(t => t.Id == tenantId, cancellationToken);
        if (!tenantExists)
        {
            return TenantMembershipResult.Fail(TenantMembershipError.NotFound, "Tenant not found.");
        }

        var duplicate = await dbContext.TenantMemberships.AnyAsync(
            m => m.UserId == userId && m.TenantId == tenantId,
            cancellationToken);
        if (duplicate)
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Conflict,
                "A membership for this user and tenant already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var membership = new TenantMembership
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            TenantId = tenantId,
            Role = role,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.TenantMemberships.Add(membership);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Conflict,
                "A membership for this user and tenant already exists.");
        }

        return TenantMembershipResult.Ok(membership);
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
}
