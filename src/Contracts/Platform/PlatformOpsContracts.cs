namespace Cohestra.Contracts.Platform;

public sealed record PlatformLimitMeterResponse(int Used, int Max);

public sealed record PlatformTenantMemberResponse(
    Guid UserId,
    string Email,
    string Role,
    bool EmailVerified);

public sealed record PlatformTenantSnapshotMemberResponse(
    string Email,
    string Role);

public sealed record PlatformTenantSnapshotResponse(
    Guid TenantId,
    string Slug,
    string Name,
    string Plan,
    string Status,
    string BillingStatus,
    bool IsComplimentary,
    PlatformLimitMeterResponse Seats,
    PlatformLimitMeterResponse Communities,
    PlatformLimitMeterResponse PublishedActivities,
    PlatformLimitMeterResponse RegistrationsThisMonth,
    DateTimeOffset? LastActivityAt,
    int OpenIssueCount,
    bool IsDemoOrLoadTest,
    IReadOnlyList<PlatformTenantSnapshotMemberResponse> Members);

public sealed record PlatformTenantOpenIssueResponse(
    Guid Id,
    string IssueNumber,
    string Subject,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record PlatformSupportReplyResponse(
    Guid Id,
    string Body,
    string? ActorEmail,
    DateTimeOffset CreatedAt);

public sealed record AddPlatformSupportReplyRequest(string Body);

public sealed record PlatformOmniSearchTenantResult(
    Guid Id,
    string Slug,
    string Name,
    string Status,
    string Plan);

public sealed record PlatformOmniSearchIssueResult(
    Guid Id,
    string IssueNumber,
    string TenantSlug,
    string Subject,
    string Status);

public sealed record PlatformOmniSearchResponse(
    IReadOnlyList<PlatformOmniSearchTenantResult> Tenants,
    IReadOnlyList<PlatformOmniSearchIssueResult> Issues);

public sealed record PlatformSupportOpenCountResponse(int Count);

public sealed record SendPlatformPasswordResetRequest(Guid MemberUserId);

public sealed record ResendPlatformEmailVerificationRequest(Guid MemberUserId);

public sealed record PlatformRecoveryActionResponse(string Message);

public sealed record CreateTenantMinimalRequest(
    string Name,
    string Slug,
    string? AdminContactEmail);
