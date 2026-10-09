namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformRecoveryRateLimitOptions
{
    public const string SectionName = "PlatformRecoveryRateLimit";

    /// <summary>Max recovery POSTs (password-reset + resend-verify) per PlatformAdmin actor in the window.</summary>
    public int MaxActionsPerWindow { get; set; } = 5;

    public int WindowMinutes { get; set; } = 15;
}
