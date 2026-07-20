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
