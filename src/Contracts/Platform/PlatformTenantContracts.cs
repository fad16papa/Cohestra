namespace Cohestra.Contracts.Platform;

public sealed record CreateTenantRequest(
    string Name,
    string Slug,
    string Plan,
    string AdminContactEmail);

public sealed record SuspendTenantRequest(string Reason);

public sealed record TenantResponse(
    Guid Id,
    string Slug,
    string Name,
    string Plan,
    string Status,
    string BillingStatus,
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
