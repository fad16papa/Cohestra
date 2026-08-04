namespace Cohestra.Infrastructure.Seed;

public sealed class DemoDataSeedSettings
{
    public const string SectionName = "DemoDataSeed";

    public bool Enabled { get; set; } = false;

    /// <summary>Communities created in addition to curated demo activities.</summary>
    public int CommunityCount { get; set; } = 4;

    /// <summary>Published activities seeded per community (plus curated scenario activities).</summary>
    public int ActivitiesPerCommunity { get; set; } = 3;

    /// <summary>Total clients: curated personas first, then synthetic fill to this count.</summary>
    public int ClientCount { get; set; } = 48;

    /// <summary>Probability (0–1) that a synthetic client registers for a bulk activity.</summary>
    public double RegistrationFillRate { get; set; } = 0.35;

    public bool IncludeOutreachTimeline { get; set; } = true;

    public bool IncludeCampaigns { get; set; } = true;

    /// <summary>Upgrade default tenant to Pro so plan-gated admin features match typical UAT.</summary>
    public bool PromoteDefaultTenantToPro { get; set; } = true;
}
