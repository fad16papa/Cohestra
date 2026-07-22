using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
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
        if (IsMarketingApexHost(hostHeader))
        {
            return TenantHostResolution.MarketingOnly();
        }

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

        if (tenant.Status != TenantStatus.Active)
        {
            return TenantHostResolution.Fail($"Tenant workspace '{normalized}' is not available.");
        }

        return TenantHostResolution.Ok(tenant.Id, tenant.Slug);
    }

    /// <summary>
    /// Production apex/www — marketing-only (no tenant SitePage). Distinct from localhost Platform 0 fallback.
    /// </summary>
    public static bool IsMarketingApexHost(string? hostHeader)
    {
        var host = NormalizeHost(hostHeader);
        if (host is "cohestra.app" or "www.cohestra.app")
        {
            return true;
        }

        if (host.EndsWith(".cohestra.app", StringComparison.Ordinal))
        {
            var without = host[..^".cohestra.app".Length];
            return without is "www" or "";
        }

        if (IsNipIoMarketingApex(host))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Host parsing: {slug}.cohestra.app, {slug}.localhost, else local DEV_TENANT_SLUG or default.
    /// Marketing apex returns empty (use <see cref="IsMarketingApexHost"/> / ResolveAsync).
    /// Arbitrary multi-label hosts are rejected (empty slug → unresolved).
    /// </summary>
    public static string ExtractSlug(string? hostHeader, IConfiguration configuration)
    {
        var host = NormalizeHost(hostHeader);
        if (string.IsNullOrWhiteSpace(host))
        {
            return ResolveFallbackSlug(configuration);
        }

        if (IsMarketingApexHost(hostHeader))
        {
            return string.Empty;
        }

        if (host.EndsWith(".cohestra.app", StringComparison.Ordinal))
        {
            var without = host[..^".cohestra.app".Length];

            // Single subdomain only — reject nested labels (foo.bar.cohestra.app).
            if (without.Contains('.', StringComparison.Ordinal))
            {
                return string.Empty;
            }

            return without;
        }

        if (TryExtractNipIoTenantSlug(host, out var nipSlug))
        {
            return nipSlug;
        }

        if (host.EndsWith(".localhost", StringComparison.Ordinal))
        {
            var without = host[..^".localhost".Length];
            if (string.IsNullOrWhiteSpace(without))
            {
                return ResolveFallbackSlug(configuration);
            }

            if (without.Contains('.', StringComparison.Ordinal))
            {
                return string.Empty;
            }

            return without;
        }

        if (host is "localhost" or "127.0.0.1" or "::1")
        {
            return ResolveFallbackSlug(configuration);
        }

        return string.Empty;
    }

    /// <summary>Strip port safely; support bracketed IPv6 via <see cref="HostString"/>.</summary>
    public static string NormalizeHost(string? hostHeader)
    {
        if (string.IsNullOrWhiteSpace(hostHeader))
        {
            return string.Empty;
        }

        try
        {
            var hostString = new HostString(hostHeader.Trim());
            var host = hostString.Host.Trim().ToLowerInvariant();
            if (host.StartsWith('[') && host.EndsWith(']') && host.Length > 2)
            {
                host = host[1..^1];
            }

            return host;
        }
        catch (Exception)
        {
            // Fall through to manual parse for odd test hosts.
        }

        var raw = hostHeader.Trim().ToLowerInvariant();
        if (raw.StartsWith('[') && raw.Contains(']'))
        {
            var end = raw.IndexOf(']');
            return end > 1 ? raw[1..end] : raw;
        }

        // hostname:port — only split on last colon when not IPv6.
        var colon = raw.LastIndexOf(':');
        if (colon > 0 && raw.Count(c => c == ':') == 1)
        {
            return raw[..colon];
        }

        return raw;
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

    /// <summary>
    /// Cloud UAT / mobile testing: <c>{slug}.129-212-235-2.nip.io</c> resolves tenant slug;
    /// apex <c>129-212-235-2.nip.io</c> is marketing-only.
    /// </summary>
    internal static bool TryExtractNipIoTenantSlug(string host, out string slug)
    {
        slug = string.Empty;
        if (!host.EndsWith(".nip.io", StringComparison.Ordinal))
        {
            return false;
        }

        var withoutSuffix = host[..^".nip.io".Length];
        var lastDot = withoutSuffix.LastIndexOf('.');
        if (lastDot < 0)
        {
            return false;
        }

        var tenantLabel = withoutSuffix[..lastDot];
        var apexLabel = withoutSuffix[(lastDot + 1)..];
        if (string.IsNullOrWhiteSpace(tenantLabel)
            || tenantLabel.Contains('.', StringComparison.Ordinal)
            || !IsNipIoIpApexLabel(apexLabel))
        {
            return false;
        }

        slug = tenantLabel;
        return true;
    }

    internal static bool IsNipIoMarketingApex(string host)
    {
        if (!host.EndsWith(".nip.io", StringComparison.Ordinal))
        {
            return false;
        }

        var withoutSuffix = host[..^".nip.io".Length];
        return !withoutSuffix.Contains('.') && IsNipIoIpApexLabel(withoutSuffix);
    }

    internal static bool IsNipIoIpApexLabel(string label)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            return false;
        }

        var hasDigit = false;
        foreach (var character in label)
        {
            if (character is >= '0' and <= '9')
            {
                hasDigit = true;
                continue;
            }

            if (character == '-')
            {
                continue;
            }

            return false;
        }

        return hasDigit;
    }
}
