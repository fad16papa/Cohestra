namespace Cohestra.Infrastructure.Auth;

public sealed class AuthResendOtpRateLimitOptions
{
    public const string SectionName = "AuthResendOtpRateLimit";

    /// <summary>Max OTP resend requests per email or IP within the window.</summary>
    public int MaxResendsPerWindow { get; set; } = 5;

    public int WindowMinutes { get; set; } = 15;
}
