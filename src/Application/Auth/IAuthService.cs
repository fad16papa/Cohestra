using Cohestra.Contracts.Auth;

namespace Cohestra.Application.Auth;

public interface IAuthService
{
    Task<OnboardingStatusResponse> GetOnboardingStatusAsync(CancellationToken cancellationToken = default);

    Task<AuthLoginResult> LoginAsync(
        string email,
        string password,
        string? host,
        CancellationToken cancellationToken = default);

    Task<AuthLoginResult> RefreshAsync(
        string refreshToken,
        string? host,
        CancellationToken cancellationToken = default);

    Task<(RegisterOperatorResponse? Response, string? Error)> RegisterAsync(
        RegisterOperatorRequest request,
        CancellationToken cancellationToken = default);

    Task<(AuthTokenResponse? Tokens, string? Error, string? ErrorCode)> VerifyEmailAsync(
        VerifyEmailOtpRequest request,
        string? host,
        string? clientIp,
        CancellationToken cancellationToken = default);

    Task<(MessageResponse? Response, string? Error)> ResendOtpAsync(
        ResendOtpRequest request,
        CancellationToken cancellationToken = default);

    Task<MessageResponse> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken = default);

    Task<(MessageResponse? Response, string? Error, string? ErrorCode)> ResetPasswordAsync(
        ResetPasswordRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default);

    Task<(MessageResponse? Response, string? Error)> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default);
}
