namespace LeadGenerationCrm.Infrastructure.Registrations;

public sealed class PublicRegistrationRateLimitOptions
{
    public const string SectionName = "PublicRegistrationRateLimit";

    public int WindowSeconds { get; set; } = 60;

    public int MaxRequests { get; set; } = 10;
}
