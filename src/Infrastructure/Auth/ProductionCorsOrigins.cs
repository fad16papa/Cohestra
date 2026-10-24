namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Dedicated Production CORS / public-origin allow-list.
/// Apex <c>https://cohestra.app</c> plus a single tenant label on <c>*.cohestra.app</c>.
/// UAT hosts, localhost, and http are refused.
/// </summary>
public static class ProductionCorsOrigins
{
    public const string ApexHost = "cohestra.app";
    public const string WwwHost = "www.cohestra.app";

    public static bool IsAllowed(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)
            || !Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!uri.IsDefaultPort)
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.AbsolutePath) && uri.AbsolutePath != "/")
        {
            return false;
        }

        return IsProductionHost(uri.IdnHost);
    }

    public static bool IsProductionPublicBaseUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!uri.IsDefaultPort)
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        if (!string.IsNullOrEmpty(uri.AbsolutePath) && uri.AbsolutePath != "/")
        {
            return false;
        }

        return IsProductionApexHost(uri.IdnHost);
    }

    public static bool IsProductionApexHost(string? host) =>
        string.Equals(host, ApexHost, StringComparison.OrdinalIgnoreCase)
        || string.Equals(host, WwwHost, StringComparison.OrdinalIgnoreCase);

    public static bool IsProductionHost(string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        if (string.Equals(host, ApexHost, StringComparison.OrdinalIgnoreCase)
            || string.Equals(host, WwwHost, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        const string suffix = ".cohestra.app";
        if (!host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var label = host[..^suffix.Length];
        if (label.Contains('.', StringComparison.Ordinal))
        {
            return false;
        }

        if (string.Equals(label, "uat", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return IsDnsLabel(label);
    }

    private static bool IsDnsLabel(string label)
    {
        if (label.Length is < 1 or > 63)
        {
            return false;
        }

        if (!char.IsAsciiLetterOrDigit(label[0]) || !char.IsAsciiLetterOrDigit(label[^1]))
        {
            return false;
        }

        foreach (var ch in label)
        {
            if (!char.IsAsciiLetterOrDigit(ch) && ch != '-')
            {
                return false;
            }
        }

        return true;
    }
}
