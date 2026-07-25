using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;

namespace Cohestra.Application.Signup;

public enum SelfServeSignupError
{
    Validation,
    Captcha,
    Conflict,
    RateLimited,
    RegistrationClosed,
}

public sealed class SelfServeSignupResult<T>
{
    public T? Value { get; init; }

    public SelfServeSignupError? Error { get; init; }

    public string? Detail { get; init; }

    public IReadOnlyList<string> Suggestions { get; init; } = [];

    public bool Succeeded => Error is null && Value is not null;

    public static SelfServeSignupResult<T> Ok(T value) => new() { Value = value };

    public static SelfServeSignupResult<T> Fail(
        SelfServeSignupError error,
        string detail,
        IReadOnlyList<string>? suggestions = null) =>
        new()
        {
            Error = error,
            Detail = detail,
            Suggestions = suggestions ?? [],
        };
}

public interface ISelfServeSignupService
{
    Task<SelfServeSignupResult<SlugAvailabilityResponse>> CheckSlugAsync(
        string? slug,
        CancellationToken cancellationToken = default);

    Task<SelfServeSignupResult<PublicSignupResponse>> SignupAsync(
        PublicSignupRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default);

    Task<SelfServeSignupResult<SignupVerifyEmailResponse>> VerifyEmailAsync(
        SignupVerifyEmailRequest request,
        CancellationToken cancellationToken = default);

    Task<SelfServeSignupResult<SignupMessageResponse>> ResendOtpAsync(
        SignupResendOtpRequest request,
        CancellationToken cancellationToken = default);
}
