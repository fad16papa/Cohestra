namespace Cohestra.Application.Registrations;

public sealed record PublicRegistrationSubmitResult
{
    public bool IsSuccess { get; init; }

    public bool IsNotFound { get; init; }

    public string? ValidationError { get; init; }

    public Guid RegistrationId { get; init; }

    public string RegistrationNumber { get; init; } = string.Empty;

    public Guid ClientId { get; init; }

    public bool IsAlreadyRegistered { get; init; }

    public bool IsActivityFull { get; init; }

    public bool IsRegistrationClosedAt { get; init; }

    public bool IsPlanRegistrationLimitReached { get; init; }

    public string? PlanLimitDetail { get; init; }

    public bool ClientCreated { get; init; }

    public bool IsReplay { get; init; }

    public bool IsIdempotencyConflict { get; init; }

    public bool ConfirmationEmailSent { get; init; }

    public bool ConfirmationEmailQueued { get; init; }

    public string? ConfirmationEmail { get; init; }

    /// <summary>Operator thank-you copy after token substitution; null when unset.</summary>
    public string? SuccessCopyMarkdown { get; init; }

    public static PublicRegistrationSubmitResult NotFound() =>
        new() { IsNotFound = true };

    public static PublicRegistrationSubmitResult Invalid(string validationError) =>
        new() { ValidationError = validationError };

    public static PublicRegistrationSubmitResult IdempotencyConflict() =>
        new() { IsIdempotencyConflict = true };

    public static PublicRegistrationSubmitResult Created(
        Guid registrationId,
        string registrationNumber,
        Guid clientId,
        bool clientCreated,
        bool isReplay = false,
        bool confirmationEmailQueued = false,
        string? confirmationEmail = null,
        string? successCopyMarkdown = null) =>
        new()
        {
            IsSuccess = true,
            RegistrationId = registrationId,
            RegistrationNumber = registrationNumber,
            ClientId = clientId,
            ClientCreated = clientCreated,
            IsReplay = isReplay,
            ConfirmationEmailQueued = confirmationEmailQueued,
            ConfirmationEmail = confirmationEmail,
            SuccessCopyMarkdown = successCopyMarkdown,
        };

    public static PublicRegistrationSubmitResult AlreadyRegistered(
        Guid registrationId,
        string registrationNumber,
        Guid clientId) =>
        new()
        {
            IsAlreadyRegistered = true,
            RegistrationId = registrationId,
            RegistrationNumber = registrationNumber,
            ClientId = clientId,
        };

    public static PublicRegistrationSubmitResult ActivityFull() =>
        new() { IsActivityFull = true };

    public static PublicRegistrationSubmitResult RegistrationClosedAt() =>
        new() { IsRegistrationClosedAt = true };

    public static PublicRegistrationSubmitResult PlanRegistrationLimitReached(string detail) =>
        new() { IsPlanRegistrationLimitReached = true, PlanLimitDetail = detail };
}
