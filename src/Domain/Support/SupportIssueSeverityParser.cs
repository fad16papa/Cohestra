namespace Cohestra.Domain.Support;

public static class SupportIssueSeverityParser
{
    public static bool TryParse(string? raw, out SupportIssueSeverity severity)
    {
        severity = default;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        var trimmed = raw.Trim();
        if (!Enum.TryParse(trimmed, ignoreCase: true, out severity)
            || !Enum.IsDefined(severity)
            || !string.Equals(severity.ToString(), trimmed, StringComparison.OrdinalIgnoreCase))
        {
            severity = default;
            return false;
        }

        return true;
    }
}
