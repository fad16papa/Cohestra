namespace Cohestra.Application.Auth;

public interface IAuthOtpStore
{
    Task<bool> TryStoreAsync(
        string email,
        OtpPurpose purpose,
        string code,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    Task<bool> ValidateAndConsumeAsync(
        string email,
        OtpPurpose purpose,
        string code,
        CancellationToken cancellationToken = default);

    Task<bool> TryRecordSendAttemptAsync(
        string email,
        OtpPurpose purpose,
        int maxAttempts,
        TimeSpan window,
        CancellationToken cancellationToken = default);
}
