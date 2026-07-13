namespace Cohestra.Application.Registrations;

public interface IRegistrationService
{
    Task<PublicRegistrationSubmitResult> SubmitPublicRegistrationAsync(
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default);
}
