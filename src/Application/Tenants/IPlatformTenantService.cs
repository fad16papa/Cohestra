using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public interface IPlatformTenantService
{
    Task<TenantListResponse> ListAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<TenantDetailResponse>> GetByIdAsync(
        Guid tenantId,
        int auditTake = 25,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<TenantResponse>> CreateAsync(
        CreateTenantRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<TenantResponse>> SuspendAsync(
        Guid tenantId,
        SuspendTenantRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<TenantResponse>> ReactivateAsync(
        Guid tenantId,
        Guid actorUserId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<TenantResponse>> ArchiveAsync(
        Guid tenantId,
        Guid actorUserId,
        CancellationToken cancellationToken = default);
}

public enum PlatformTenantError
{
    None = 0,
    Validation = 1,
    NotFound = 2,
    Conflict = 3,
}

public sealed record PlatformTenantResult<T>(
    bool Succeeded,
    T? Value,
    PlatformTenantError Error,
    string? Detail)
{
    public static PlatformTenantResult<T> Ok(T value) => new(true, value, PlatformTenantError.None, null);

    public static PlatformTenantResult<T> Fail(PlatformTenantError error, string detail) =>
        new(false, default, error, detail);
}
