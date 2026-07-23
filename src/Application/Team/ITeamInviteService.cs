using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Team;

public enum TeamInviteError
{
    None,
    Validation,
    PlanLocked,
    SeatCapReached,
    Conflict,
    NotFound,
    Expired,
    Revoked,
}

public sealed record TeamInviteResult(
    bool Succeeded,
    TeamInviteError Error,
    string? Detail)
{
    public static TeamInviteResult Ok() => new(true, TeamInviteError.None, null);

    public static TeamInviteResult Fail(TeamInviteError error, string detail) =>
        new(false, error, detail);
}

public sealed record TeamOverviewDto(
    string Plan,
    int SeatLimit,
    int ActiveMembers,
    int PendingInvites,
    int SeatsUsed,
    bool InvitesAllowed,
    bool SeatCapReached,
    IReadOnlyList<TeamMemberDto> Members,
    IReadOnlyList<TeamPendingInviteDto> Invites);

public sealed record TeamMemberDto(
    Guid UserId,
    string Email,
    string? Nickname,
    string Role,
    DateTimeOffset JoinedAt);

public sealed record TeamPendingInviteDto(
    Guid InviteId,
    string Email,
    string Role,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record InvitePreviewDto(
    string TenantName,
    string TenantSlug,
    string Email,
    string Role,
    DateTimeOffset ExpiresAt);

public sealed record AcceptInviteCommand(
    string Token,
    string Password,
    string? Nickname);

public sealed record AcceptInviteResultDto(
    string Email,
    string TenantSlug,
    bool CreatedAccount);

public interface ITeamInviteService
{
    Task<TeamOverviewDto> GetOverviewAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<TeamInviteResult> CreateInviteAsync(
        Guid tenantId,
        Guid invitedByUserId,
        string email,
        TenantMembershipRole role,
        string acceptBaseUrl,
        CancellationToken cancellationToken = default);

    Task<TeamInviteResult> RevokeInviteAsync(
        Guid tenantId,
        Guid inviteId,
        CancellationToken cancellationToken = default);

    Task<TeamInviteResult> RemoveMemberAsync(
        Guid tenantId,
        Guid actorUserId,
        Guid memberUserId,
        CancellationToken cancellationToken = default);

    Task<InvitePreviewDto?> GetInvitePreviewAsync(string token, CancellationToken cancellationToken = default);

    Task<(TeamInviteResult Result, AcceptInviteResultDto? Value)> AcceptInviteAsync(
        AcceptInviteCommand command,
        CancellationToken cancellationToken = default);
}
