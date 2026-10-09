using System.Net;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsHealthIntegrationTests(IntegrationTestFixture fixture)
{
    private static readonly string[] ReadyCheckNames = ["default-tenant", "postgres", "redis"];
    private static readonly string[] NotInProbeNames = ["hosted-jobs", "outbox", "paddle", "sendgrid"];

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Ready_contract_stays_anonymous_three_checks_without_rich_diagnostics()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("status", out var status));
        Assert.Equal(JsonValueKind.String, status.ValueKind);
        Assert.True(root.TryGetProperty("checks", out var checks));
        Assert.Equal(JsonValueKind.Object, checks.ValueKind);

        var names = checks.EnumerateObject().Select(property => property.Name).OrderBy(name => name).ToArray();
        Assert.Equal(ReadyCheckNames, names);
        foreach (var check in checks.EnumerateObject())
        {
            var propertyNames = check.Value.EnumerateObject().Select(property => property.Name).ToArray();
            Assert.Equal(["status"], propertyNames);
            Assert.False(check.Value.TryGetProperty("duration", out _));
            Assert.False(check.Value.TryGetProperty("description", out _));
            Assert.False(check.Value.TryGetProperty("durationMs", out _));
        }

        Assert.False(root.TryGetProperty("notInProbe", out _));
        Assert.False(root.TryGetProperty("observedAt", out _));
        Assert.False(root.TryGetProperty("overallStatus", out _));
        Assert.Equal(2, root.EnumerateObject().Count());
    }

    [SkippableFact]
    public async Task PlatformAdmin_health_maps_ready_checks_and_marks_not_in_probe()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/platform/ops/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        AssertNoSecretPatterns(body);

        var health = JsonSerializer.Deserialize<PlatformOpsHealthResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(health);
        Assert.Contains(
            health.OverallStatus,
            new[]
            {
                PlatformHealthStatuses.Healthy,
                PlatformHealthStatuses.Degraded,
                PlatformHealthStatuses.Unhealthy,
            });
        Assert.Equal(TimeSpan.Zero, health.ObservedAt.Offset);
        Assert.Equal(
            ReadyCheckNames,
            health.Checks.Select(check => check.Name).OrderBy(name => name).ToArray());
        Assert.All(health.Checks, check =>
        {
            Assert.Contains(
                check.Status,
                new[]
                {
                    PlatformHealthStatuses.Healthy,
                    PlatformHealthStatuses.Degraded,
                    PlatformHealthStatuses.Unhealthy,
                });
            Assert.True(check.DurationMs is >= 0);
            Assert.NotEqual(PlatformHealthStatuses.NotInProbe, check.Status);
        });
        Assert.Equal(
            NotInProbeNames,
            health.NotInProbe.Select(check => check.Name).OrderBy(name => name).ToArray());
        Assert.All(health.NotInProbe, check =>
        {
            Assert.Equal(PlatformHealthStatuses.NotInProbe, check.Status);
            Assert.Null(check.DurationMs);
            Assert.DoesNotContain("Healthy", check.Description, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("OK", check.Description, StringComparison.Ordinal);
            Assert.DoesNotContain("Operational", check.Description, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Unavailable", check.Description, StringComparison.OrdinalIgnoreCase);
        });
    }

    [SkippableFact]
    public async Task Anonymous_health_is_unauthorized()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/platform/ops/health");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static void AssertNoSecretPatterns(string body)
    {
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Username=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("User ID=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Host=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("redis://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rediss://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Bearer ", body, StringComparison.Ordinal);
        Assert.DoesNotContain("ApiKey", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("StackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SG.", body, StringComparison.Ordinal);
        Assert.DoesNotContain("eyJ", body, StringComparison.Ordinal);
    }
}
