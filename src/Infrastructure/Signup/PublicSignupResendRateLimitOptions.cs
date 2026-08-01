namespace Cohestra.Infrastructure.Signup;

public sealed class PublicSignupResendRateLimitOptions
{
    public const string SectionName = "PublicSignupResendRateLimit";

    /// <summary>Max OTP resend requests per email or IP within the window.</summary>
    public int MaxResendsPerWindow { get; set; } = 5;

    public int WindowMinutes { get; set; } = 15;
}
