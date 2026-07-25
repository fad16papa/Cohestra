namespace Cohestra.Domain.Tenants;

/// <summary>
/// Marker for tenant-owned entities. Global query filters attach in Epic 13 — not enabled in 11.2.
/// </summary>
public interface ITenantScoped
{
    Guid TenantId { get; set; }
}
