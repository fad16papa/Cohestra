namespace Cohestra.Infrastructure.Tenants;

public static class EmbedOriginSupport
{
    public const int MaxOrigins = 20;

    public static string? ValidateOrigin(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin))
        {
            return "Origin must be a non-empty http or https URL with a host.";
        }

        if (origin.Contains('*', StringComparison.Ordinal))
        {
            return "Wildcards are not allowed in embed origins.";
        }

        if (!Uri.TryCreate(origin.Trim(), UriKind.Absolute, out var uri))
        {
            return "Origin must be a valid absolute URL (e.g. https://club.example.com).";
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return "Origin scheme must be http or https.";
        }

        if (string.IsNullOrWhiteSpace(uri.Host))
        {
            return "Origin must include a host.";
        }

        if (!string.IsNullOrEmpty(uri.PathAndQuery) && uri.AbsolutePath != "/")
        {
            return "Origin must not include a path.";
        }

        if (!string.IsNullOrEmpty(uri.Query) || uri.Fragment.Length > 0)
        {
            return "Origin must not include query or fragment.";
        }

        if (uri.UserInfo.Length > 0)
        {
            return "Origin must not include user credentials.";
        }

        return null;
    }

    public static string NormalizeOrigin(string origin)
    {
        var uri = new Uri(origin.Trim(), UriKind.Absolute);
        var port = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
        return $"{uri.Scheme.ToLowerInvariant()}://{uri.Host.ToLowerInvariant()}{port}";
    }

    public static (bool Ok, IReadOnlyList<string> Origins, string? Error) NormalizeList(
        IReadOnlyList<string>? origins)
    {
        if (origins is null)
        {
            return (false, [], "AllowedEmbedOrigins is required.");
        }

        var normalized = new List<string>(origins.Count);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var origin in origins)
        {
            var validationError = ValidateOrigin(origin);
            if (validationError is not null)
            {
                return (false, [], validationError);
            }

            var canonical = NormalizeOrigin(origin!);
            if (!seen.Add(canonical))
            {
                continue;
            }

            normalized.Add(canonical);
        }

        if (normalized.Count > MaxOrigins)
        {
            return (false, [], $"At most {MaxOrigins} embed origins are allowed.");
        }

        return (true, normalized, null);
    }

    public static IReadOnlyList<string> SanitizeStoredOrigins(IReadOnlyList<string>? stored)
    {
        if (stored is null || stored.Count == 0)
        {
            return [];
        }

        var normalized = new List<string>(stored.Count);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var origin in stored)
        {
            if (ValidateOrigin(origin) is not null)
            {
                continue;
            }

            var canonical = NormalizeOrigin(origin);
            if (seen.Add(canonical))
            {
                normalized.Add(canonical);
            }
        }

        if (normalized.Count > MaxOrigins)
        {
            normalized = normalized.Take(MaxOrigins).ToList();
        }

        return normalized;
    }
}
