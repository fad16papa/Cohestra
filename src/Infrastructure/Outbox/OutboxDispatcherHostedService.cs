using Cohestra.Application.Outbox;
using Cohestra.Infrastructure.Observability;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Outbox;

public sealed class OutboxDispatcherHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<OutboxOptions> options,
    ILogger<OutboxDispatcherHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            logger.LogInformation("Outbox dispatcher is disabled.");
            return;
        }

        var pollInterval = TimeSpan.FromSeconds(Math.Max(1, settings.PollIntervalSeconds));
        await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processed = 0;
                await CohestraTelemetry.TraceJobAsync("outbox-dispatcher", async () =>
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var processor = scope.ServiceProvider.GetRequiredService<IOutboxProcessor>();
                    processed = await processor.ProcessBatchAsync(stoppingToken);
                });

                if (processed == 0)
                {
                    await Task.Delay(pollInterval, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Outbox dispatcher batch failed.");
                await Task.Delay(pollInterval, stoppingToken);
            }
        }
    }
}
