using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Tenants;

public static class RegistrationTimeZoneSupport
{
    public const int MaxTimeZoneIdLength = 64;

    private static readonly HashSet<string> KnownTimeZoneIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "UTC",
        "Etc/UTC",
        "Asia/Singapore",
        "Asia/Manila",
        "Asia/Tokyo",
        "Asia/Hong_Kong",
        "Asia/Kolkata",
        "Asia/Dubai",
        "Asia/Bangkok",
        "Asia/Jakarta",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Australia/Sydney",
        "Australia/Melbourne",
        "Australia/Perth",
        "Pacific/Auckland",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Amsterdam",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Vancouver",
        "America/Sao_Paulo",
        "America/Mexico_City",
    };

    public static string Normalize(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return RegistrationTimeZoneDefaults.Utc;
        }

        var trimmed = timeZoneId.Trim();
        if (trimmed.Length > MaxTimeZoneIdLength)
        {
            return RegistrationTimeZoneDefaults.Utc;
        }

        return trimmed;
    }

    public static string? Validate(string? timeZoneId)
    {
        var normalized = Normalize(timeZoneId);
        if (!TryResolve(normalized, out _))
        {
            return "Timezone must be a valid IANA identifier (e.g. Asia/Singapore).";
        }

        return null;
    }

    public static TimeZoneInfo Resolve(string? timeZoneId)
    {
        var normalized = Normalize(timeZoneId);
        return TryResolve(normalized, out var resolved)
            ? resolved
            : TimeZoneInfo.Utc;
    }

    public static bool TryResolve(string timeZoneId, out TimeZoneInfo timeZone)
    {
        timeZone = TimeZoneInfo.Utc;
        if (TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var resolved))
        {
            timeZone = resolved;
            return true;
        }

        // Windows dev machines may only expose Windows IDs.
        if (OperatingSystem.IsWindows())
        {
            var windowsId = MapIanaToWindows(timeZoneId);
            if (windowsId is not null && TimeZoneInfo.TryFindSystemTimeZoneById(windowsId, out resolved))
            {
                timeZone = resolved;
                return true;
            }
        }

        return false;
    }

    public static IReadOnlyList<(string Id, string Label)> CommonChoices()
    {
        return KnownTimeZoneIds
            .Where(id => TryResolve(id, out _))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(id => GetDisplayLabel(id), StringComparer.OrdinalIgnoreCase)
            .Select(id => (id, GetDisplayLabel(id)))
            .ToList();
    }

    public static string GetDisplayLabel(string? timeZoneId)
    {
        var normalized = Normalize(timeZoneId);
        if (string.Equals(normalized, RegistrationTimeZoneDefaults.Utc, StringComparison.OrdinalIgnoreCase)
            || string.Equals(normalized, "Etc/UTC", StringComparison.OrdinalIgnoreCase))
        {
            return "UTC";
        }

        var slash = normalized.LastIndexOf('/');
        return slash >= 0 && slash < normalized.Length - 1
            ? normalized[(slash + 1)..].Replace('_', ' ')
            : normalized;
    }

    public static string FormatResetHint(DateTimeOffset nextMonthStartUtc, string? timeZoneId)
    {
        var timeZone = Resolve(timeZoneId);
        var localReset = TimeZoneInfo.ConvertTime(nextMonthStartUtc, timeZone);
        var label = GetDisplayLabel(timeZoneId);
        return $"Resets {localReset:MMM d, yyyy}, 00:00 {label}";
    }

    private static string? MapIanaToWindows(string ianaId) =>
        ianaId switch
        {
            "Asia/Singapore" => "Singapore Standard Time",
            "Asia/Manila" => "Singapore Standard Time",
            "Asia/Tokyo" => "Tokyo Standard Time",
            "Asia/Hong_Kong" => "China Standard Time",
            "Asia/Kolkata" => "India Standard Time",
            "Asia/Dubai" => "Arabian Standard Time",
            "Asia/Bangkok" => "SE Asia Standard Time",
            "Asia/Jakarta" => "SE Asia Standard Time",
            "Asia/Seoul" => "Korea Standard Time",
            "Asia/Shanghai" => "China Standard Time",
            "Australia/Sydney" => "AUS Eastern Standard Time",
            "Australia/Melbourne" => "AUS Eastern Standard Time",
            "Australia/Perth" => "W. Australia Standard Time",
            "Pacific/Auckland" => "New Zealand Standard Time",
            "Europe/London" => "GMT Standard Time",
            "Europe/Paris" => "Romance Standard Time",
            "Europe/Berlin" => "W. Europe Standard Time",
            "Europe/Amsterdam" => "W. Europe Standard Time",
            "America/New_York" => "Eastern Standard Time",
            "America/Chicago" => "Central Standard Time",
            "America/Denver" => "Mountain Standard Time",
            "America/Los_Angeles" => "Pacific Standard Time",
            "America/Toronto" => "Eastern Standard Time",
            "America/Vancouver" => "Pacific Standard Time",
            "America/Sao_Paulo" => "E. South America Standard Time",
            "America/Mexico_City" => "Central Standard Time (Mexico)",
            _ => null,
        };
}
