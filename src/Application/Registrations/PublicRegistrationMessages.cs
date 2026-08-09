namespace Cohestra.Application.Registrations;

/// <summary>
/// Registrant-facing copy. Must not expose tenant plan limits, billing, or workspace internals.
/// </summary>
public static class PublicRegistrationMessages
{
    public const string PlanLimitReachedTitle = "Registration closed";

    public const string PlanLimitReachedDetail =
        "This activity is not accepting new registrations right now. Please try again later or contact the event organizer.";
}
