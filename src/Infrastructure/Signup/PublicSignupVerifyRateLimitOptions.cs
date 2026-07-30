namespace Cohestra.Infrastructure.Signup;

public sealed class PublicSignupVerifyRateLimitOptions
{
    public const string SectionName = "PublicSignupVerifyRateLimit";

    /// <summary>Max failed OTP verify attempts per email or IP within the window.</summary>
    public int MaxFailedAttemptsPerWindow { get; set; } = 10;

    public int WindowMinutes { get; set; } = 15;
}
