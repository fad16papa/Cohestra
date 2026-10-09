using Cohestra.Application.Billing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class PaddleWebhookMissingSecretWebApplicationFactory : PaddleWebhookWebApplicationFactory
{
    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("Paddle:WebhookSecret", string.Empty);
    }
}

public sealed class PaddleWebhookThrowingDiagnosticWebApplicationFactory : PaddleWebhookWebApplicationFactory
{
    protected override void ConfigureTestServices(IWebHostBuilder builder)
    {
        base.ConfigureTestServices(builder);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPaddleWebhookDeliveryRecorder>();
            services.AddSingleton<IPaddleWebhookDeliveryRecorder, ThrowingPaddleWebhookDeliveryRecorder>();
        });
    }
}

internal sealed class ThrowingPaddleWebhookDeliveryRecorder : IPaddleWebhookDeliveryRecorder
{
    public Task RecordAsync(
        PaddleWebhookDeliveryRecord record,
        CancellationToken cancellationToken = default) =>
        throw new InvalidOperationException("Simulated diagnostic writer failure.");
}
