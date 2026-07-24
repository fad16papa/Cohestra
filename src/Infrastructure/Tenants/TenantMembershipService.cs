using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cohestra.Infrastructure.Tenants;

public sealed class TenantMembershipService(CohestraDbContext dbContext) : ITenantMembershipService
{
    /// <summary>
    /// Bootstrap is closed only when default has a TenantAdmin membership whose Identity user is email-confirmed.
    /// </summary>
    public Task<bool> DefaultTenantHasTenantAdminAsync(CancellationToken cancellationToken = default) =>
        dbContext.TenantMemberships
            .Where(m => m.TenantId == TenantIds.Default && m.Role == TenantMembershipRole.TenantAdmin)
            .Join(
                dbContext.Users,
                membership => membership.UserId,
                user => user.Id,
                (_, user) => user)
            .AnyAsync(user => user.EmailConfirmed, cancellationToken);

    public Task<int> CountMembershipsForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        dbContext.TenantMemberships.CountAsync(m => m.UserId == userId, cancellationToken);

    public Task<TenantMembership?> GetMembershipAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default) =>
        dbContext.TenantMemberships.AsNoTracking().FirstOrDefaultAsync(
            m => m.UserId == userId && m.TenantId == tenantId,
            cancellationToken);

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
            return ExistingMembershipResult(existing, role);
        }

        var created = await CreateMembershipAsync(userId, tenantId, role, cancellationToken);
        if (created.Succeeded || created.Error != TenantMembershipError.Conflict)
        {
            return created;
        }

        // Race: another request inserted the unique pair — re-read and treat as ensure.
        existing = await dbContext.TenantMemberships.FirstOrDefaultAsync(
            m => m.UserId == userId && m.TenantId == tenantId,
            cancellationToken);

        return existing is null
            ? created
            : ExistingMembershipResult(existing, role);
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
            dbContext.Entry(membership).State = EntityState.Detached;
            return TenantMembershipResult.Fail(
                TenantMembershipError.Conflict,
                "A membership for this user and tenant already exists.");
        }

        return TenantMembershipResult.Ok(membership);
    }

    private static TenantMembershipResult ExistingMembershipResult(
        TenantMembership existing,
        TenantMembershipRole requestedRole)
    {
        if (existing.Role != requestedRole)
        {
            return TenantMembershipResult.Fail(
                TenantMembershipError.Conflict,
                "A membership for this user and tenant already exists with a different role.");
        }

        return TenantMembershipResult.Ok(existing);
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
}
