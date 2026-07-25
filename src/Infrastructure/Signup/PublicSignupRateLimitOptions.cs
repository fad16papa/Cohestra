namespace Cohestra.Infrastructure.Signup;

public sealed class PublicSignupRateLimitOptions
{
    public const string SectionName = "PublicSignupRateLimit";

    public int MaxSuccessfulPerHour { get; set; } = 5;

    public int MaxSuccessfulPerDay { get; set; } = 20;
}
