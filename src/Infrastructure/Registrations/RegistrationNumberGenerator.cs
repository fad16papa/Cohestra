using System.Globalization;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RegistrationNumberGenerator(CohestraDbContext dbContext)
{
    public const int SequenceDigits = 6;

    public static string Format(DateTimeOffset timestamp, int sequence)
    {
        if (sequence is < 1 or > 999_999)
        {
            throw new ArgumentOutOfRangeException(
                nameof(sequence),
                sequence,
                "Registration sequence must be between 1 and 999999.");
        }

        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        return $"REG{datePart}{sequence:D6}";
    }

    public async Task<string> GenerateNextAsync(
        DateTimeOffset timestamp,
        CancellationToken cancellationToken = default)
    {
        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        var prefix = $"REG{datePart}";

        var latestNumber = await dbContext.Registrations
            .Where(registration => registration.RegistrationNumber.StartsWith(prefix))
            .OrderByDescending(registration => registration.RegistrationNumber)
            .Select(registration => registration.RegistrationNumber)
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
