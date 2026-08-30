namespace Cohestra.Application.Registrations;

public sealed record RegistrationOperatorNotifySendResult(
    bool Sent,
    string? RecipientEmail);

public interface IRegistrationOperatorNotifyService
{
    Task<RegistrationOperatorNotifySendResult> SendOperatorNotifyIfApplicableAsync(
        Guid registrationId,
        CancellationToken cancellationToken = default);
}
