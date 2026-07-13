namespace Cohestra.Infrastructure.Auth;

public sealed class OperatorSeedSettings
{
    public const string SectionName = "OperatorSeed";

    public string Email { get; set; } = "operator@cohestra.local";

    public string Password { get; set; } = "ChangeMe123!";

    /// <summary>When false, no operator is seeded — use onboarding registration instead.</summary>
    public bool Enabled { get; set; } = false;
}
