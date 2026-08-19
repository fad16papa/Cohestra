using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformTenantOpsService
{
    Task<PlatformTenantResult<PlatformTenantSnapshotResponse>> GetSnapshotAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<IReadOnlyList<PlatformTenantMemberResponse>>> ListMembersAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<IReadOnlyList<PlatformTenantOpenIssueResponse>>> ListOpenIssuesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<PlatformRecoveryActionResponse>> SendPasswordResetAsync(
        Guid tenantId,
        Guid memberUserId,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default);

    Task<PlatformTenantResult<PlatformRecoveryActionResponse>> ResendEmailVerificationAsync(
        Guid tenantId,
        Guid memberUserId,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default);

    Task<PlatformOmniSearchResponse> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default);
}
