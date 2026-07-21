using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Tenancy;

public sealed class TenantHostResolver(
    CohestraDbContext dbContext,
    IConfiguration configuration) : ITenantHostResolver
{
    public const string DevTenantSlugConfigKey = "DEV_TENANT_SLUG";

    public async Task<TenantHostResolution> ResolveAsync(
        string? hostHeader,
        CancellationToken cancellationToken = default)
    {
        var slug = ExtractSlug(hostHeader, configuration);
        if (string.IsNullOrWhiteSpace(slug))
        {
            return TenantHostResolution.Fail("Could not resolve tenant from Host.");
        }

        var normalized = slug.Trim().ToLowerInvariant();
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Slug == normalized, cancellationToken);

        if (tenant is null)
        {
            return TenantHostResolution.Fail($"Unknown tenant workspace '{normalized}'.");
        }

        return TenantHostResolution.Ok(tenant.Id, tenant.Slug);
    }

    /// <summary>
    /// Host parsing: {slug}.cohestra.app, {slug}.localhost, else DEV_TENANT_SLUG or default.
    /// </summary>
    public static string ExtractSlug(string? hostHeader, IConfiguration configuration)
    {
        var host = hostHeader?.Trim() ?? string.Empty;
        if (host.Contains(':', StringComparison.Ordinal))
        {
            host = host.Split(':')[0];
        }

        host = host.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(host))
        {
            return ResolveFallbackSlug(configuration);
        }

        if (host.EndsWith(".cohestra.app", StringComparison.Ordinal))
        {
            var without = host[..^".cohestra.app".Length];
            if (without is "www" or "")
            {
                return ResolveFallbackSlug(configuration);
            }

            return without.Contains('.') ? without.Split('.')[0] : without;
        }

        if (host.EndsWith(".localhost", StringComparison.Ordinal))
        {
            var without = host[..^".localhost".Length];
            return string.IsNullOrWhiteSpace(without) ? ResolveFallbackSlug(configuration) : without;
        }

        if (host is "localhost" or "127.0.0.1" or "::1" or "cohestra.app" or "www.cohestra.app")
        {
            return ResolveFallbackSlug(configuration);
        }

        // Bare hostname — treat first label as slug when multi-part, else fallback
        if (host.Contains('.', StringComparison.Ordinal))
        {
            return host.Split('.')[0];
        }

        return ResolveFallbackSlug(configuration);
    }

    private static string ResolveFallbackSlug(IConfiguration configuration)
    {
        var configured = configuration[DevTenantSlugConfigKey]
            ?? configuration.GetSection("Tenancy")["DevTenantSlug"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.Trim().ToLowerInvariant();
        }

        return TenantIds.DefaultSlug;
    }
}
