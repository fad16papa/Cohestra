using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityExpirationHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<ActivityExpirationOptions> options,
    ILogger<ActivityExpirationHostedService> logger) : BackgroundService
{
    private const long ActivityExpirationAdvisoryLockKey = 574839201234567892L;
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation("Activity expiration job is disabled.");
            return;
        }

        try
        {
            await RunBackfillPassAsync(stoppingToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Activity ScheduledStartsAt startup backfill failed.");
        }

        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunExpirationPassAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Activity expiration run failed.");
            }

            await Task.Delay(RunInterval, stoppingToken);
        }
    }

    internal async Task RunBackfillPassAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled)
        {
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var expirationService = scope.ServiceProvider.GetRequiredService<ActivityExpirationService>();

        if (!await TryAcquireLockAsync(dbContext, cancellationToken))
        {
            logger.LogInformation("Activity backfill skipped — another instance holds the advisory lock.");
            return;
        }

        try
        {
            var backfilledCount = await expirationService.BackfillMissingScheduledStartsAtAsync(cancellationToken);
            if (backfilledCount > 0)
            {
                logger.LogInformation("Startup backfill updated {Count} activities.", backfilledCount);
            }
        }
        finally
        {
            await ReleaseLockAsync(dbContext, cancellationToken);
        }
    }

    internal async Task RunExpirationPassAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled)
        {
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var expirationService = scope.ServiceProvider.GetRequiredService<ActivityExpirationService>();

        if (!await TryAcquireLockAsync(dbContext, cancellationToken))
        {
            logger.LogInformation("Activity expiration skipped — another instance holds the advisory lock.");
            return;
        }

        try
        {
            await expirationService.BackfillMissingScheduledStartsAtAsync(cancellationToken);

            var warningsQueued = await expirationService.SendExpiringSoonWarningsAsync(
                DateTimeOffset.UtcNow,
                cancellationToken);

            if (warningsQueued > 0)
            {
                logger.LogInformation("Activity expiration queued {Count} expiring-soon warnings.", warningsQueued);
            }

            var archivedCount = await expirationService.ArchiveExpiredPublishedActivitiesAsync(
                DateTimeOffset.UtcNow,
                cancellationToken);

            if (archivedCount > 0)
            {
                logger.LogInformation("Activity expiration archived {Count} published activities.", archivedCount);
            }
        }
        finally
        {
            await ReleaseLockAsync(dbContext, cancellationToken);
        }
    }

    private static Task<bool> TryAcquireLockAsync(
        CohestraDbContext dbContext,
        CancellationToken cancellationToken) =>
        dbContext.Database.SqlQueryRaw<bool>(
                "SELECT pg_try_advisory_lock({0}) AS \"Value\"",
                ActivityExpirationAdvisoryLockKey)
            .SingleAsync(cancellationToken);

    private static Task ReleaseLockAsync(
        CohestraDbContext dbContext,
        CancellationToken cancellationToken) =>
        dbContext.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_unlock({0})",
            [ActivityExpirationAdvisoryLockKey],
            cancellationToken);
}
