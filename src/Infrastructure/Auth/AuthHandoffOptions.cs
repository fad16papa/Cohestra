namespace Cohestra.Infrastructure.Auth;

public sealed class AuthHandoffOptions
{
    public const string SectionName = "AuthHandoff";

    public int TtlSeconds { get; set; } = 120;
}
