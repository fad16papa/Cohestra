namespace Cohestra.Application.Tenants;

public sealed record TenantHostResolution(
    bool Succeeded,
    Guid? TenantId,
    string? Slug,
    string? ErrorDetail,
    bool IsMarketingHost = false)
{
    public static TenantHostResolution Ok(Guid tenantId, string slug) =>
        new(true, tenantId, slug, null, false);

    public static TenantHostResolution Fail(string detail) =>
        new(false, null, null, detail, false);

    /// <summary>
    /// Production apex/www — no tenant SitePage context (AD-2).
    /// </summary>
    public static TenantHostResolution MarketingOnly() =>
        new(false, null, null, "Marketing host has no tenant SitePage context.", true);
}

public interface ITenantHostResolver
{
    /// <summary>
    /// Maps HTTP Host to a Tenant by slug. Never trusts X-Tenant-Id.
    /// Apex/www returns <see cref="TenantHostResolution.MarketingOnly"/> (not default tenant).
    /// </summary>
    Task<TenantHostResolution> ResolveAsync(
        string? hostHeader,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Public door resolution — includes suspended/archived tenants (Story 15.7).
    /// </summary>
    Task<TenantDoorResolution> ResolveDoorAsync(
        string? hostHeader,
        CancellationToken cancellationToken = default);
}
