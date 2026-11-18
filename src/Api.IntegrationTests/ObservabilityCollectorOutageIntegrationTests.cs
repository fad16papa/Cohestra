using System.Net;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class ObservabilityCollectorOutageIntegrationTests
{
    private static readonly string[] ReadyCheckNames = ["default-tenant", "postgres", "redis"];

    [SkippableFact]
    public async Task Collector_outage_does_not_crash_health_or_ready()
    {
        await using var factory = new ObservabilityCollectorOutageWebApplicationFactory();
        await factory.InitializeAsync();
        IntegrationTestHelpers.SkipIfUnavailable(factory);

        using var client = factory.CreateClient();

        using var health = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);

        using var ready = await client.GetAsync("/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);

        using var doc = JsonDocument.Parse(await ready.Content.ReadAsStringAsync());
        var checks = doc.RootElement.GetProperty("checks");
        var names = checks.EnumerateObject().Select(property => property.Name).OrderBy(name => name).ToArray();
        Assert.Equal(ReadyCheckNames, names);
        Assert.Equal(3, names.Length);
        Assert.Equal(2, doc.RootElement.EnumerateObject().Count());
    }
}
