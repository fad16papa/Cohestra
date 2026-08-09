namespace Cohestra.Infrastructure.Seed;

/// <summary>
/// Identifies load-test workspaces seeded for volume/UX testing.
/// </summary>
public static class LoadTestTenantRules
{
    public const string SlugPrefix = "load-";

    public static bool IsLoadTestSlug(string? slug) =>
        !string.IsNullOrWhiteSpace(slug)
        && slug.Trim().StartsWith(SlugPrefix, StringComparison.Ordinal);

    /// <summary>
    /// Load-test Core workspaces unlock the website composer so QA can exercise builder UI at scale.
    /// </summary>
    public static bool UnlocksWebsiteBuilder(string? slug, bool isComplimentary) =>
        IsLoadTestSlug(slug);

}
