namespace Cohestra.Application.Platform;

public interface IPlatformRecoveryRateLimiter
{
    /// <summary>
    /// Atomically consumes one recovery slot for the PlatformAdmin actor.
    /// Shared across password-reset and email-verification resend.
    /// </summary>
    /// <returns><c>true</c> if the request is allowed; <c>false</c> if the actor is over the limit.</returns>
    Task<bool> TryConsumeAsync(Guid actorUserId, CancellationToken cancellationToken = default);
}
