namespace LeadGenerationCrm.Application.Registrations;

public sealed record RegistrationConfirmationSendResult(
    bool Sent,
    string? RecipientEmail);

public interface IRegistrationNotificationService
{
    Task<RegistrationConfirmationSendResult> SendConfirmationIfApplicableAsync(
        Guid registrationId,
        CancellationToken cancellationToken = default);
}
