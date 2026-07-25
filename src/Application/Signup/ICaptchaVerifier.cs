namespace Cohestra.Application.Signup;

public interface ICaptchaVerifier
{
    Task<(bool Valid, string? Error)> VerifyAsync(
        string? captchaToken,
        string? remoteIp,
        CancellationToken cancellationToken = default);
}
