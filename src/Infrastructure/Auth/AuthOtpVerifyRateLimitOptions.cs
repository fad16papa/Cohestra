namespace Cohestra.Infrastructure.Auth;

public sealed class AuthOtpVerifyRateLimitOptions
{
    public const string SectionName = "AuthOtpVerifyRateLimit";

    /// <summary>Max failed OTP verify attempts per email or IP within the window.</summary>
    public int MaxFailedAttemptsPerWindow { get; set; } = 10;

    public int WindowMinutes { get; set; } = 15;
}
