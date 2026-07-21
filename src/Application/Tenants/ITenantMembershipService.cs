using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public enum TenantMembershipError
{
    None = 0,
    Validation = 1,
    NotFound = 2,
    Conflict = 3,
}

public sealed record TenantMembershipResult(
    bool Succeeded,
    TenantMembership? Value,
    TenantMembershipError Error,
    string? Detail)
{
    public static TenantMembershipResult Ok(TenantMembership value) =>
        new(true, value, TenantMembershipError.None, null);

    public static TenantMembershipResult Fail(TenantMembershipError error, string detail) =>
        new(false, null, error, detail);
}

public interface ITenantMembershipService
{
    Task<bool> DefaultTenantHasTenantAdminAsync(CancellationToken cancellationToken = default);

    Task<int> CountMembershipsForUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<TenantMembership?> GetMembershipAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<TenantMembershipResult> EnsureMembershipAsync(
        Guid userId,
        Guid tenantId,
        TenantMembershipRole role,
        CancellationToken cancellationToken = default);

    Task<TenantMembershipResult> CreateMembershipAsync(
        Guid userId,
        Guid tenantId,
        TenantMembershipRole role,
        CancellationToken cancellationToken = default);
}
