using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Registrations;

internal enum RegistrationAvailabilityState
{
    Available,
    ActivityFull,
    PlanPaused,
    ClosedAt,
    ActivityEnded,
    NotPublished,
}

internal static class RegistrationAvailabilityEvaluator
{
    public static RegistrationAvailabilityState Evaluate(
        Activity activity,
        int registrationCount,
        int registrationsThisMonth,
        PlanLimits limits,
        string tenantTimeZoneId,
        DateTimeOffset utcNow)
    {
        if (activity.Status != ActivityStatus.Published)
        {
            return RegistrationAvailabilityState.NotPublished;
        }

        if (ActivityCapacityValidator.IsRegistrationFull(activity.MaxRegistrants, registrationCount))
        {
            return RegistrationAvailabilityState.ActivityFull;
        }

        if (registrationsThisMonth >= limits.RegistrationsPerMonth)
        {
            return RegistrationAvailabilityState.PlanPaused;
        }

        if (RegistrationCloseAtEvaluator.IsPastCloseAt(activity.FormSchema, utcNow))
        {
            return RegistrationAvailabilityState.ClosedAt;
        }

        if (!ActivityScheduleExpiration.IsRegistrationOpen(activity, tenantTimeZoneId, utcNow))
        {
            return RegistrationAvailabilityState.ActivityEnded;
        }

        return RegistrationAvailabilityState.Available;
    }
}
