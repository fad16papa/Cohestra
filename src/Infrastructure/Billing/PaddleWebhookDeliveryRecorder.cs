using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Billing;

public sealed class PaddleWebhookDeliveryRecorder(
    IServiceScopeFactory scopeFactory,
    ILogger<PaddleWebhookDeliveryRecorder> logger) : IPaddleWebhookDeliveryRecorder
{
    public async Task RecordAsync(
        PaddleWebhookDeliveryRecord record,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            dbContext.PaddleWebhookDeliveries.Add(new PaddleWebhookDelivery
            {
                Id = Guid.CreateVersion7(),
                EventId = NormalizeOptional(record.EventId, 255),
                EventType = NormalizeOptional(record.EventType, 128),
                Disposition = record.Disposition,
                TenantId = record.TenantId is { } tenantId && tenantId != Guid.Empty
                    ? tenantId
                    : null,
                HttpStatus = record.HttpStatus,
                DetailSanitized = PlatformHealthDescriptionSanitizer.Sanitize(record.Detail),
                ObservedAt = DateTimeOffset.UtcNow,
            });
            await dbContext.SaveChangesAsync(cancellationToken);
            await PaddleWebhookDeliveryRetention.PruneAsync(
                dbContext,
                DateTimeOffset.UtcNow,
                cancellationToken: cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Paddle webhook diagnostic record failed; webhook HTTP result is unchanged.");
        }
    }

    private static string? NormalizeOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
