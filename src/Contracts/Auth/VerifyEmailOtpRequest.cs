namespace Cohestra.Contracts.Auth;

public sealed record VerifyEmailOtpRequest(
    string Email,
    string Code);
