using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformOpsHealthService(HealthCheckService healthChecks) : IPlatformOpsHealthService
{
    private static readonly string[] NotInProbeNames =
    [
        PlatformHealthNotInProbeNames.Outbox,
        PlatformHealthNotInProbeNames.Paddle,
        PlatformHealthNotInProbeNames.SendGrid,
        PlatformHealthNotInProbeNames.HostedJobs,
    ];

    public async Task<PlatformOpsHealthResponse> GetAsync(CancellationToken cancellationToken = default)
    {
        var report = await healthChecks.CheckHealthAsync(
            check => check.Tags.Contains("ready"),
            cancellationToken);
        var observedAt = DateTimeOffset.UtcNow;

        var checks = report.Entries
            .Select(entry => new PlatformHealthCheckResult(
                entry.Key,
                entry.Value.Status.ToString(),
                entry.Value.Duration.TotalMilliseconds,
                PlatformHealthDescriptionSanitizer.Sanitize(entry.Value.Description)))
            .OrderBy(check => check.Name, StringComparer.Ordinal)
            .ToList();

        var notInProbe = NotInProbeNames
            .Select(name => new PlatformHealthCheckResult(
                name,
                PlatformHealthStatuses.NotInProbe,
                null,
                "Not measured by this probe."))
            .ToList();

        return new PlatformOpsHealthResponse(
            report.Status.ToString(),
            observedAt,
            checks,
            notInProbe);
    }
}
