namespace LeadGenerationCrm.Infrastructure.Seed;

public sealed class DemoDataSeedSettings
{
    public const string SectionName = "DemoDataSeed";

    public bool Enabled { get; set; } = false;

    public int CommunityCount { get; set; } = 6;

    public int ActivitiesPerCommunity { get; set; } = 10;

    public int ClientCount { get; set; } = 100;
}
