namespace Cohestra.Contracts.Auth;

public sealed record ResetPasswordRequest(
    string Email,
    string Code,
    string NewPassword);
