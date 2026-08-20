using System.Globalization;
using System.Security.Cryptography;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportIssueNumberGenerator
{
    public const int SuffixDigits = 6;
    private const int MaxSuffixExclusive = 1_000_000;

    public static string Format(DateTimeOffset timestamp, int suffix)
    {
        if (suffix is < 0 or >= MaxSuffixExclusive)
        {
            throw new ArgumentOutOfRangeException(
                nameof(suffix),
                suffix,
                "Support issue suffix must be between 0 and 999999.");
        }

        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        return $"SUP{datePart}{suffix:D6}";
    }

    public Task<string> GenerateNextAsync(
        DateTimeOffset timestamp,
        CancellationToken cancellationToken = default)
    {
        var suffix = RandomNumberGenerator.GetInt32(0, MaxSuffixExclusive);
        return Task.FromResult(Format(timestamp, suffix));
    }
}
