namespace Cohestra.Infrastructure.Tenancy;

/// <summary>
/// Builds browser-facing tenant workspace URLs from configured public base URL + slug.
/// Avoids relying on API <see cref="Microsoft.AspNetCore.Http.HttpRequest.Host"/>
/// (Docker internal host, missing port behind nginx).
/// </summary>
public static class TenantPublicWebUrlBuilder
{
    public static string BuildTenantOrigin(string publicBaseUrl, string tenantSlug)
    {
        var slug = tenantSlug.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new ArgumentException("Tenant slug is required.", nameof(tenantSlug));
        }

        if (!Uri.TryCreate(publicBaseUrl.Trim(), UriKind.Absolute, out var baseUri))
        {
            return $"https://{slug}.cohestra.app";
        }

        var scheme = baseUri.Scheme;
        var host = baseUri.Host;
        var portSuffix = baseUri.IsDefaultPort ? string.Empty : $":{baseUri.Port}";

        if (host is "localhost" or "127.0.0.1")
        {
            return $"{scheme}://{slug}.localhost{portSuffix}";
        }

        if (host.EndsWith(".nip.io", StringComparison.OrdinalIgnoreCase))
        {
            var nipHost = host.StartsWith("www.", StringComparison.OrdinalIgnoreCase)
                ? host[4..]
                : host;
            var parts = nipHost.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            // Tenant host: slug.129-212-235-2.nip.io
            if (parts.Length >= 4)
            {
                return baseUri.GetLeftPart(UriPartial.Authority);
            }

            // Marketing apex: 129-212-235-2.nip.io
            if (parts.Length == 3)
            {
                return $"{scheme}://{slug}.{parts[0]}.nip.io{portSuffix}";
            }
        }

        if (host.Equals("cohestra.app", StringComparison.OrdinalIgnoreCase)
            || host.Equals("www.cohestra.app", StringComparison.OrdinalIgnoreCase))
        {
            return $"https://{slug}.cohestra.app";
        }

        if (host.EndsWith(".cohestra.app", StringComparison.OrdinalIgnoreCase))
        {
            return $"https://{slug}.cohestra.app";
        }

        return baseUri.GetLeftPart(UriPartial.Authority);
    }

    public static string BuildTenantPath(string publicBaseUrl, string tenantSlug, string path)
    {
        var origin = BuildTenantOrigin(publicBaseUrl, tenantSlug);
        var normalizedPath = path.StartsWith('/') ? path : $"/{path}";
        return $"{origin.TrimEnd('/')}{normalizedPath}";
    }
}
