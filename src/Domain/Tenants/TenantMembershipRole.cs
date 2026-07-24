namespace Cohestra.Domain.Tenants;

/// <summary>PRD tenant org role on a membership — never includes PlatformAdmin (AD-7 / FR-7).</summary>
public enum TenantMembershipRole
{
    TenantAdmin = 0,
    TenantMember = 1,
}
