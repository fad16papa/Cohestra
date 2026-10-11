using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Same-workspace allow-list for Paddle portal and checkout return URLs.
/// Uses the authenticated tenant's public origin, not API
/// <see cref="Microsoft.AspNetCore.Http.HttpRequest.Scheme"/> /
/// <see cref="Microsoft.AspNetCore.Http.HttpRequest.Host"/> — those stay
/// <c>http</c> behind the two-proxy UAT hop because ForwardedHeaders trusts
/// loopback only.
/// </summary>
public static class BillingReturnUrl
{
    public static string TenantOrigin(string publicBaseUrl, string tenantSlug) =>
        TenantPublicWebUrlBuilder.BuildTenantOrigin(publicBaseUrl, tenantSlug);

    public static string TenantPath(string publicBaseUrl, string tenantSlug, string path) =>
        TenantPublicWebUrlBuilder.BuildTenantPath(publicBaseUrl, tenantSlug, path);

    public static string? VerifiedCustomDomain(
        string? customDomain,
        DateTimeOffset? verifiedAt) =>
        verifiedAt is null ? null : SanitizeHost(customDomain);

    public static bool IsAllowed(
        string? candidate,
        string publicBaseUrl,
        string tenantSlug,
        string? verifiedCustomDomain = null)
    {
        if (string.IsNullOrWhiteSpace(candidate)
            || string.IsNullOrWhiteSpace(tenantSlug)
            || !TryAbsoluteHttpOrigin(publicBaseUrl, out _)
            || !Uri.TryCreate(candidate, UriKind.Absolute, out var returnUri)
            || !IsHttpOrHttps(returnUri)
            || !string.IsNullOrEmpty(returnUri.UserInfo))
        {
            return false;
        }

        foreach (var origin in AllowedOrigins(publicBaseUrl, tenantSlug, verifiedCustomDomain))
        {
            if (MatchesWorkspace(returnUri, origin))
            {
                return true;
            }
        }

        return false;
    }

    public static IReadOnlyList<Uri> AllowedOrigins(
        string publicBaseUrl,
        string tenantSlug,
        string? verifiedCustomDomain = null)
    {
        var origins = new List<Uri>(2);
        if (!TryAbsoluteHttpOrigin(publicBaseUrl, out _)
            || !Uri.TryCreate(TenantOrigin(publicBaseUrl, tenantSlug), UriKind.Absolute, out var tenantOrigin)
            || !IsHttpOrHttps(tenantOrigin))
        {
            return origins;
        }

        origins.Add(tenantOrigin);

        var customHost = SanitizeHost(verifiedCustomDomain);
        if (customHost is not null
            && origins.Count > 0
            && Uri.TryCreate($"{origins[0].Scheme}://{customHost}", UriKind.Absolute, out var customOrigin)
            && IsHttpOrHttps(customOrigin))
        {
            origins.Add(customOrigin);
        }

        return origins;
    }

    private static string? SanitizeHost(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var host = value.Trim().TrimEnd('.');
        if (host.Contains('/', StringComparison.Ordinal)
            || host.Contains('\\', StringComparison.Ordinal)
            || host.Contains('@', StringComparison.Ordinal)
            || host.StartsWith('.'))
        {
            return null;
        }

        if (!Uri.TryCreate($"{Uri.UriSchemeHttps}://{host}", UriKind.Absolute, out var parsed)
            || !IsHttpOrHttps(parsed)
            || string.IsNullOrWhiteSpace(parsed.Host))
        {
            return null;
        }

        return parsed.Host;
    }

    private static bool TryAbsoluteHttpOrigin(string? publicBaseUrl, out Uri publicBase)
    {
        publicBase = null!;
        return !string.IsNullOrWhiteSpace(publicBaseUrl)
            && Uri.TryCreate(publicBaseUrl.Trim(), UriKind.Absolute, out publicBase!)
            && IsHttpOrHttps(publicBase);
    }

    private static bool MatchesWorkspace(Uri returnUri, Uri origin) =>
        string.Equals(returnUri.Scheme, origin.Scheme, StringComparison.OrdinalIgnoreCase)
        && string.Equals(returnUri.Host, origin.Host, StringComparison.OrdinalIgnoreCase);

    private static bool IsHttpOrHttps(Uri uri) =>
        uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        || uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase);
}
