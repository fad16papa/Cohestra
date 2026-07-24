namespace Cohestra.Domain.Tenants;

/// <summary>
/// Public surface presentation for a tenant (FR-3).
/// Registration allowance is separate (<see cref="TenantAccessEvaluation.PublicRegistrationAllowed"/>).
/// </summary>
public enum TenantPublicSurface
{
    Available = 0,
    Maintenance = 1,
    NotFound = 2,
}
