namespace LeadGenerationCrm.Infrastructure.Registrations;

public sealed class RegistrationIdempotencyOptions
{
    public const string SectionName = "RegistrationIdempotency";

    public int ResultTtlHours { get; set; } = 24;

    public int LockSeconds { get; set; } = 60;
}
