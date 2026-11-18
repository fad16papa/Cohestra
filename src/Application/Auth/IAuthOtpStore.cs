namespace Cohestra.Application.Auth;

public interface IAuthOtpStore
{
    Task<bool> TryStoreAsync(
        string email,
        OtpPurpose purpose,
        string code,
        TimeSpan ttl,
        CancellationToken cancellationToken = default,
        string? bindingScope = null);

    Task<bool> ValidateAndConsumeAsync(
        string email,
        OtpPurpose purpose,
        string code,
        CancellationToken cancellationToken = default,
        string? bindingScope = null);

    Task<bool> TryRecordSendAttemptAsync(
        string email,
        OtpPurpose purpose,
        int maxAttempts,
        TimeSpan window,
        CancellationToken cancellationToken = default,
        string? bindingScope = null);

    Task RemoveAsync(
        string email,
        OtpPurpose purpose,
        CancellationToken cancellationToken = default,
        string? bindingScope = null);

    /// <summary>
    /// Counts a failed check. Returns false once the budget is exhausted and the stored code is removed.
    /// </summary>
    Task<bool> TryRecordFailedVerificationAsync(
        string email,
        OtpPurpose purpose,
        int maxFailures,
        CancellationToken cancellationToken = default,
        string? bindingScope = null);
}
