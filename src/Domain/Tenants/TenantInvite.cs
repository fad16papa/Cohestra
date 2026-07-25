namespace Cohestra.Domain.Tenants;

/// <summary>
/// Pending team invite for Core+ seat caps (Story 14.6).
/// </summary>
public sealed class TenantInvite : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Email { get; set; } = string.Empty;

    public TenantMembershipRole Role { get; set; } = TenantMembershipRole.TenantMember;

    public string TokenHash { get; set; } = string.Empty;

    public Guid InvitedByUserId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public DateTimeOffset? AcceptedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public bool IsPending(DateTimeOffset now) =>
        RevokedAt is null && AcceptedAt is null && ExpiresAt > now;
}
