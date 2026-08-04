namespace Cohestra.Contracts.Signup;

public sealed record SlugAvailabilityResponse(
    bool Available,
    string Slug,
    string? ValidationError,
    IReadOnlyList<string> Suggestions);

public sealed record PublicSignupResponse(
    string Email,
    string TenantSlug,
    int OtpExpiresInSeconds,
    string Message);

public sealed record SignupVerifyEmailResponse(
    string TenantSlug,
    string? AccessToken = null,
    string? RefreshToken = null,
    int? ExpiresInSeconds = null,
    string? HandoffCode = null,
    int? HandoffExpiresInSeconds = null);

public sealed record SignupMessageResponse(string Message);

public sealed record SignupVerifyEmailRequest(
    string? Email,
    string? Code,
    string? TenantSlug,
    bool ForCheckout = false);

public sealed record SignupResendOtpRequest(
    string? Email,
    string? TenantSlug);
