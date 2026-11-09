namespace Cohestra.Contracts.Team;

public sealed record TeamOverviewResponse(
    string Plan,
    int SeatLimit,
    int ActiveMembers,
    int PendingInvites,
    int SeatsUsed,
    bool InvitesAllowed,
    bool SeatCapReached,
    IReadOnlyList<TeamMemberResponse> Members,
    IReadOnlyList<TeamPendingInviteResponse> Invites);

public sealed record TeamMemberResponse(
    string UserId,
    string Email,
    string? Nickname,
    string Role,
    DateTimeOffset JoinedAt);

public sealed record TeamPendingInviteResponse(
    string InviteId,
    string Email,
    string Role,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record CreateTeamInviteRequest(
    string Email,
    string Role);

public sealed record InvitePreviewResponse(
    string TenantName,
    string TenantSlug,
    string Email,
    string Role,
    DateTimeOffset ExpiresAt,
    bool RequiresActivationOtp = false);

public sealed record StartInviteActivationRequest(string Token, string? Nickname);

public sealed record StartInviteActivationResponse(
    bool CodeSent,
    string MaskedEmail,
    int ExpiresInSeconds);

public sealed record CompleteInviteActivationRequest(
    string Token,
    string Password,
    string? Nickname,
    string Code);

public sealed record AcceptTeamInviteRequest(
    string Token,
    string Password,
    string? Nickname);

public sealed record AcceptTeamInviteResponse(
    string Email,
    string TenantSlug,
    bool CreatedAccount);
