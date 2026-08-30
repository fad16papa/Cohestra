using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Registrations;

internal static class RegistrationCloseAtEvaluator
{
    public static bool IsPastCloseAt(ActivityFormSchema? schema, DateTimeOffset utcNow) =>
        IsPastCloseAt(schema?.Meta?.RegistrationClosesAt, utcNow);

    public static bool IsPastCloseAt(ActivityFormSchemaDto? schema, DateTimeOffset utcNow) =>
        IsPastCloseAt(schema?.Meta?.RegistrationClosesAt, utcNow);

    public static bool IsPastCloseAt(DateTimeOffset? closesAt, DateTimeOffset utcNow)
    {
        if (closesAt is null)
        {
            return false;
        }

        return utcNow >= closesAt.Value.ToUniversalTime();
    }
}
