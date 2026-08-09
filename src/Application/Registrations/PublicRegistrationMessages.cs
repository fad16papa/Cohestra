namespace Cohestra.Application.Registrations;

/// <summary>
/// Registrant-facing copy. Must not expose tenant plan limits, billing, or workspace internals.
/// </summary>
public static class PublicRegistrationMessages
{
    public const string PlanLimitReachedTitle = "Sign-ups paused temporarily";

    public const string PlanLimitReachedDetail =
        "This activity is not accepting new registrations right now. Contact the event organizer if you would like to join, or check back later.";
}
