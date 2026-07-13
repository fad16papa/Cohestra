namespace Cohestra.Infrastructure.Auth;

public sealed class AuthOtpSettings
{
    public const string SectionName = "AuthOtp";

    public int CodeLength { get; set; } = 6;

    public int ExpiryMinutes { get; set; } = 10;

    public int MaxSendAttemptsPerWindow { get; set; } = 3;

    public int SendWindowMinutes { get; set; } = 15;
}
