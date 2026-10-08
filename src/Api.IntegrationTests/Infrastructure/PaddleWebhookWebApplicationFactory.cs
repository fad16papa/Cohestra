using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Isolated host with sandbox Paddle webhook credentials. Does not mutate the shared collection factory.
/// </summary>
public sealed class PaddleWebhookWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    public const string WebhookSecret = "pdl_ntfset_integration_test";

    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("Paddle:ApiKey", "pdl_sdbx_integration_test");
        builder.UseSetting("Paddle:ClientToken", "test_integration");
        builder.UseSetting("Paddle:WebhookSecret", WebhookSecret);
        builder.UseSetting("Paddle:Environment", "sandbox");
        builder.UseSetting("Paddle:PriceCoreMonthly", "pri_core_m");
        builder.UseSetting("Paddle:PriceCoreAnnual", "pri_core_a");
        builder.UseSetting("Paddle:PriceProMonthly", "pri_pro_m");
        builder.UseSetting("Paddle:PriceProAnnual", "pri_pro_a");
    }
}
