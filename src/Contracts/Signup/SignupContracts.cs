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
    string AccessToken,
    string RefreshToken,
    int ExpiresInSeconds,
    string TenantSlug);

public sealed record SignupMessageResponse(string Message);

public sealed record SignupVerifyEmailRequest(
    string? Email,
    string? Code,
    string? TenantSlug);

public sealed record SignupResendOtpRequest(
    string? Email,
    string? TenantSlug);
