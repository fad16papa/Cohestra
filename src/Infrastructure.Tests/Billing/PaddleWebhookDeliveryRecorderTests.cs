using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleWebhookDeliveryRecorderTests
{
    [Fact]
    public async Task Record_sanitizes_and_uses_isolated_context()
    {
        var database = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<CohestraDbContext>(options => options.UseInMemoryDatabase(database));
        await using var provider = services.BuildServiceProvider();
        var recorder = new PaddleWebhookDeliveryRecorder(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<PaddleWebhookDeliveryRecorder>.Instance);

        await recorder.RecordAsync(new PaddleWebhookDeliveryRecord(
            PaddleWebhookDeliveryDisposition.Rejected,
            400,
            "Invalid Paddle-Signature. WebhookSecret=pdl_ntfset_leak ClientToken=test_leak",
            EventId: null,
            EventType: null));

        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var row = Assert.Single(await db.PaddleWebhookDeliveries.ToListAsync());
        Assert.Equal(PaddleWebhookDeliveryDisposition.Rejected, row.Disposition);
        Assert.Equal(400, row.HttpStatus);
        Assert.Null(row.EventId);
        Assert.Null(row.EventType);
        Assert.True(row.DetailSanitized!.Length <= 200);
        Assert.DoesNotContain("pdl_ntfset_leak", row.DetailSanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("test_leak", row.DetailSanitized, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Record_swallows_writer_failures()
    {
        var recorder = new PaddleWebhookDeliveryRecorder(
            new ThrowingScopeFactory(),
            NullLogger<PaddleWebhookDeliveryRecorder>.Instance);

        await recorder.RecordAsync(new PaddleWebhookDeliveryRecord(
            PaddleWebhookDeliveryDisposition.Processed,
            200,
            "Processed."));
    }

    private sealed class ThrowingScopeFactory : IServiceScopeFactory
    {
        public IServiceScope CreateScope() => throw new InvalidOperationException("isolated writer failed");
    }
}
