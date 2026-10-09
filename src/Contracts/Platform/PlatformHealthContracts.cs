namespace Cohestra.Contracts.Platform;

public static class PlatformHealthStatuses
{
    public const string Healthy = "Healthy";
    public const string Degraded = "Degraded";
    public const string Unhealthy = "Unhealthy";
    public const string NotInProbe = "not_in_probe";
}

public static class PlatformHealthCheckNames
{
    public const string Postgres = "postgres";
    public const string Redis = "redis";
    public const string DefaultTenant = "default-tenant";
}

public static class PlatformHealthNotInProbeNames
{
    public const string Outbox = "outbox";
    public const string Paddle = "paddle";
    public const string SendGrid = "sendgrid";
    public const string HostedJobs = "hosted-jobs";
}

public sealed record PlatformHealthCheckResult(
    string Name,
    string Status,
    double? DurationMs,
    string? Description);

public sealed record PlatformOpsHealthResponse(
    string OverallStatus,
    DateTimeOffset ObservedAt,
    IReadOnlyList<PlatformHealthCheckResult> Checks,
    IReadOnlyList<PlatformHealthCheckResult> NotInProbe);
