namespace Cohestra.Domain.Tenants;

/// <summary>
/// AD-7: links a global Identity user to a Tenant with TenantAdmin or TenantMember.
/// Platform Admin is never stored here.
/// </summary>
public sealed class TenantMembership
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid TenantId { get; set; }

    public TenantMembershipRole Role { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
