namespace Cohestra.Contracts.Registrations;

/// <summary>
/// Public registration submit request (v1). See docs/contracts/public-registration-v1.md.
/// </summary>
/// <param name="ActivitySlug">Published activity slug.</param>
/// <param name="Answers">
/// Map of form field ids to submitted values. Validated against the activity form schema.
/// </param>
public sealed record SubmitPublicRegistrationRequest(
    string ActivitySlug,
    IReadOnlyDictionary<string, object?> Answers);

/// <summary>
/// Public registration success response (v1). See docs/contracts/public-registration-v1.md.
/// </summary>
/// <param name="Status">Success value: <c>created</c>.</param>
/// <param name="Message">Human-readable confirmation for participants.</param>
/// <param name="RegistrationId">Immutable registration record identifier.</param>
/// <param name="RegistrationNumber">Human-readable registration number for check-in.</param>
/// <param name="ClientId">Master client record identifier (created or updated).</param>
/// <param name="ConfirmationEmailSent">True when a confirmation email was delivered to the participant.</param>
/// <param name="ConfirmationEmail">Recipient address when an email was attempted or sent; null when no email on file.</param>
public sealed record SubmitPublicRegistrationResponse(
    string Status,
    string Message,
    Guid RegistrationId,
    string RegistrationNumber,
    Guid ClientId,
    bool ConfirmationEmailSent = false,
    string? ConfirmationEmail = null);
