namespace Cohestra.Infrastructure.Auth;

public sealed class PlatformAdminSeedSettings
{
    public const string SectionName = "PlatformAdminSeed";

    public string Email { get; set; } = "platform-admin@cohestra.local";

    public string Password { get; set; } = "ChangeMe123!";

    /// <summary>When false, only the PlatformAdmin role is ensured — no user is seeded.</summary>
    public bool Enabled { get; set; }
}
