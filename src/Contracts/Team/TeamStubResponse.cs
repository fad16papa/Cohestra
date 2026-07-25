namespace Cohestra.Contracts.Team;

/// <summary>
/// Placeholder until Epic 14 Team invite/seats. Kept Admin-only via TenantAdminOnly policy.
/// </summary>
public sealed record TeamStubResponse(IReadOnlyList<TeamMemberStubDto> Members);

public sealed record TeamMemberStubDto(string UserId, string Role);
