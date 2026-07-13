namespace Cohestra.Contracts.Auth;

public sealed record ResendOtpRequest(
    string Email,
    string Purpose);
