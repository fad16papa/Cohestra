using Cohestra.Application.Tenants;

namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Scoped ambient tenant context. Middleware sets once per request.
/// </summary>
public sealed class CurrentTenant : ICurrentTenant
{
    public Guid? TenantId { get; private set; }

    public string? Slug { get; private set; }

    public bool IsResolved { get; private set; }

    public bool IsMarketingHost { get; private set; }

    public void SetResolved(Guid tenantId, string slug)
    {
        TenantId = tenantId;
        Slug = slug;
        IsResolved = true;
        IsMarketingHost = false;
    }

    public void SetMarketingHost()
    {
        TenantId = null;
        Slug = null;
        IsResolved = false;
        IsMarketingHost = true;
    }
}
