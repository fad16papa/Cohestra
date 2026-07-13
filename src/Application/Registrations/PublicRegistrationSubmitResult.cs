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

    public bool ClientCreated { get; init; }

    public bool IsReplay { get; init; }

    public bool IsIdempotencyConflict { get; init; }

    public bool ConfirmationEmailSent { get; init; }

    public string? ConfirmationEmail { get; init; }

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
        bool isReplay = false) =>
        new()
        {
            IsSuccess = true,
            RegistrationId = registrationId,
            RegistrationNumber = registrationNumber,
            ClientId = clientId,
            ClientCreated = clientCreated,
            IsReplay = isReplay,
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
}
