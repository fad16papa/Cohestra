using System.Globalization;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportIssueNumberGenerator(CohestraDbContext dbContext)
{
    public const int SequenceDigits = 6;

    public static string Format(DateTimeOffset timestamp, int sequence)
    {
        if (sequence is < 1 or > 999_999)
        {
            throw new ArgumentOutOfRangeException(
                nameof(sequence),
                sequence,
                "Support issue sequence must be between 1 and 999999.");
        }

        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        return $"SUP{datePart}{sequence:D6}";
    }

    public async Task<string> GenerateNextAsync(
        DateTimeOffset timestamp,
        CancellationToken cancellationToken = default)
    {
        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        var prefix = $"SUP{datePart}";

        var latestNumber = await dbContext.SupportIssues
            .IgnoreQueryFilters()
            .Where(issue => issue.IssueNumber.StartsWith(prefix))
            .OrderByDescending(issue => issue.IssueNumber)
            .Select(issue => issue.IssueNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextSequence = 1;
        if (latestNumber is not null &&
            latestNumber.Length == prefix.Length + SequenceDigits &&
            int.TryParse(
                latestNumber.AsSpan(prefix.Length),
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var parsedSequence))
        {
            nextSequence = parsedSequence + 1;
        }

        return Format(timestamp, nextSequence);
    }
}
