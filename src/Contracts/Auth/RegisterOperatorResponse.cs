namespace Cohestra.Contracts.Auth;

public sealed record RegisterOperatorResponse(
    string Email,
    int OtpExpiresInSeconds,
    string Message);
