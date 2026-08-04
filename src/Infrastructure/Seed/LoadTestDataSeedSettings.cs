namespace Cohestra.Infrastructure.Seed;

public sealed class LoadTestDataSeedSettings
{
    public const string SectionName = "LoadTestSeed";

    public bool Enabled { get; set; } = false;

    /// <summary>
    /// When true, removes existing load-test tenants (slug prefix <c>load-</c>) and re-seeds.
    /// </summary>
    public bool ForceReseed { get; set; } = false;

    public string Password { get; set; } = "LoadTest123!";
}
