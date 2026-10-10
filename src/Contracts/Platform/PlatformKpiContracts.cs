namespace Cohestra.Contracts.Platform;

public static class PlatformKpiFreshness
{
    public const string Actual = "actual";
    public const string MissingInstrumentation = "missing_instrumentation";
    public const string Unavailable = "unavailable";
    public const string Stale = "stale";
}

public static class PlatformKpiSources
{
    public const string Tenants = "PostgreSQL tenants";
    public const string SupportIssues = "PostgreSQL support_issues";
    public const string NotInstrumented = "Not instrumented";
    public const string HealthChecks = "Authenticated HealthCheckService (postgres, redis, default-tenant)";
    public const string HealthUnavailable = "Authenticated health request failed";
    public const string GitSha = "GIT_SHA";
    public const string GitShaMalformed = "GIT_SHA malformed";
    public const string HostEnvironment = "IHostEnvironment.EnvironmentName";
    public const string ApiContract = "API contract v1";
}

public sealed record PlatformKpi<T>(
    T? Value,
    string Source,
    DateTimeOffset ObservedAt,
    string Freshness);

public sealed record PlatformNamedCount(string Key, int Count);

public sealed record PlatformOpsOverviewResponse(
    PlatformKpi<IReadOnlyList<PlatformNamedCount>> TenantStatusCounts,
    PlatformKpi<IReadOnlyList<PlatformNamedCount>> BillingStatusCounts,
    PlatformKpi<int> OpenSupportCount,
    PlatformKpi<string?> StackHealth);

public sealed record PlatformOpsVersionResponse(
    PlatformKpi<string?> GitSha,
    PlatformKpi<string> EnvironmentName,
    PlatformKpi<string> ApiVersion);
