namespace Cohestra.Contracts.Platform;

public sealed record CreateTenantRequest(
    string Name,
    string Slug,
    string Plan,
    string AdminContactEmail,
    bool IsComplimentary = false);

public sealed record SuspendTenantRequest(string Reason);

/// <summary>
/// Set or clear complimentary (Sponsored) plan. <paramref name="IsComplimentary"/> is required
/// (omit/null → 400). When true, <paramref name="Plan"/> must be Basic, Core, or Pro.
/// Stripe IDs are left unchanged.
/// </summary>
public sealed record SetComplimentaryRequest(
    bool? IsComplimentary,
    string? Plan,
    string? Reason);

public sealed record TenantResponse(
    Guid Id,
    string Slug,
    string Name,
    string Plan,
    string Status,
    string BillingStatus,
    bool IsComplimentary,
    string? AdminContactEmail,
    DateTimeOffset? SuspendedAt,
    DateTimeOffset? ArchivedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record TenantListItemResponse(
    Guid Id,
    string Slug,
    string Name,
    string Plan,
    string Status,
    string BillingStatus,
    bool IsComplimentary,
    string? AdminContactEmail,
    DateTimeOffset CreatedAt,
    int ActivityCount,
    int ClientCount);

public sealed record TenantListResponse(
    IReadOnlyList<TenantListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PlatformAuditEntryResponse(
    Guid Id,
    Guid ActorUserId,
    Guid TenantId,
    string Action,
    string? Reason,
    DateTimeOffset CreatedAt);

public sealed record TenantDetailResponse(
    TenantResponse Tenant,
    IReadOnlyList<PlatformAuditEntryResponse> RecentAudits);

public sealed record PlatformProfileResponse(
    string UserId,
    string Email,
    IReadOnlyList<string> Roles);
