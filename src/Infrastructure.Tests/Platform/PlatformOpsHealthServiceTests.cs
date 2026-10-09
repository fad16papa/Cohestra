using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Platform;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformOpsHealthServiceTests
{
    [Fact]
    public async Task Maps_healthy_ready_checks_and_marks_unchecked_not_in_probe()
    {
        var health = await CreateService(
            ("postgres", HealthCheckResult.Healthy("ok")),
            ("redis", HealthCheckResult.Healthy("ok")),
            ("default-tenant", HealthCheckResult.Healthy("Default tenant (Platform 0) is present.")))
            .GetAsync();

        Assert.Equal(PlatformHealthStatuses.Healthy, health.OverallStatus);
        Assert.Equal(TimeSpan.Zero, health.ObservedAt.Offset);
        Assert.Equal(
            new[] { "default-tenant", "postgres", "redis" },
            health.Checks.Select(check => check.Name).ToArray());
        Assert.All(health.Checks, check =>
        {
            Assert.Equal(PlatformHealthStatuses.Healthy, check.Status);
            Assert.True(check.DurationMs >= 0);
        });
        Assert.Equal(
            new[] { "hosted-jobs", "outbox", "paddle", "sendgrid" }.OrderBy(x => x).ToArray(),
            health.NotInProbe.Select(check => check.Name).OrderBy(x => x).ToArray());
        Assert.All(health.NotInProbe, check =>
        {
            Assert.Equal(PlatformHealthStatuses.NotInProbe, check.Status);
            Assert.Null(check.DurationMs);
            Assert.DoesNotContain("Healthy", check.Description, StringComparison.OrdinalIgnoreCase);
        });
    }

    [Fact]
    public async Task Overall_follows_health_report_and_sanitizes_unhealthy_description()
    {
        var degraded = await CreateService(
            ("postgres", HealthCheckResult.Healthy("ok")),
            ("redis", HealthCheckResult.Degraded("slow")),
            ("default-tenant", HealthCheckResult.Healthy("ok")))
            .GetAsync();
        Assert.Equal(PlatformHealthStatuses.Degraded, degraded.OverallStatus);
        Assert.Contains(degraded.Checks, check => check is { Name: "redis", Status: PlatformHealthStatuses.Degraded });

        var unhealthy = await CreateService(
            ("postgres", HealthCheckResult.Unhealthy("Host=secret.db;Password=leak")),
            ("redis", HealthCheckResult.Healthy("ok")),
            ("default-tenant", HealthCheckResult.Healthy("ok")))
            .GetAsync();
        Assert.Equal(PlatformHealthStatuses.Unhealthy, unhealthy.OverallStatus);
        var postgres = Assert.Single(unhealthy.Checks, check => check.Name == "postgres");
        Assert.Equal(PlatformHealthStatuses.Unhealthy, postgres.Status);
        Assert.DoesNotContain("leak", postgres.Description, StringComparison.Ordinal);
        Assert.DoesNotContain("secret.db", postgres.Description, StringComparison.Ordinal);
    }

    private static PlatformOpsHealthService CreateService(params (string Name, HealthCheckResult Result)[] checks)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        var builder = services.AddHealthChecks();
        foreach (var (name, result) in checks)
        {
            var captured = result;
            builder.AddCheck(name, () => captured, tags: ["ready"]);
        }

        var provider = services.BuildServiceProvider();
        return new PlatformOpsHealthService(provider.GetRequiredService<HealthCheckService>());
    }
}
