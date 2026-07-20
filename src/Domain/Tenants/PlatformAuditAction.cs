namespace Cohestra.Domain.Tenants;

public enum PlatformAuditAction
{
    TenantCreated = 0,
    TenantSuspended = 1,
    TenantReactivated = 2,
    TenantArchived = 3,
}
