using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Integration host for Story 46.12 loopback-style load: real API stack, LoadTestSeed off.
/// </summary>
public sealed class ProductionLikeLoadWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("LoadTestSeed:Enabled", "false");
        builder.UseSetting("LoadTestSeed:ForceReseed", "false");
    }
}