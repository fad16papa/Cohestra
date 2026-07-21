using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public sealed record TenantHostResolution(
    bool Succeeded,
    Guid? TenantId,
    string? Slug,
    string? ErrorDetail)
{
    public static TenantHostResolution Ok(Guid tenantId, string slug) =>
        new(true, tenantId, slug, null);

    public static TenantHostResolution Fail(string detail) =>
        new(false, null, null, detail);
}

public interface ITenantHostResolver
{
    /// <summary>
    /// Maps HTTP Host to a Tenant by slug. Never trusts X-Tenant-Id.
    /// </summary>
    Task<TenantHostResolution> ResolveAsync(
        string? hostHeader,
        CancellationToken cancellationToken = default);
}
