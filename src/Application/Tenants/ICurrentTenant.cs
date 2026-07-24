namespace Cohestra.Application.Tenants;

/// <summary>
/// Ambient per-request Tenant Context set by TenantResolutionMiddleware.
/// Never populated from X-Tenant-Id alone (AD-3).
/// </summary>
public interface ICurrentTenant
{
    Guid? TenantId { get; }

    string? Slug { get; }

    bool IsResolved { get; }

    bool IsMarketingHost { get; }
}
