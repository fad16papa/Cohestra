using System.Globalization;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Parses Paddle money strings as integer minor units. Rejects decimal or
/// scientific notation so Cohestra never guesses a currency scale.
/// </summary>
internal static class PaddleMinorUnits
{
    public static long? TryParse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Contains('.', StringComparison.Ordinal)
            || trimmed.Contains(',', StringComparison.Ordinal)
            || trimmed.Contains('e', StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return long.TryParse(
            trimmed,
            NumberStyles.AllowLeadingSign,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : null;
    }
}
