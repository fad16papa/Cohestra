using Cohestra.Application.Outbox;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Outbox;

public sealed class OutboxPublisherTests
{
    [Fact]
    public void Enqueue_AddsPendingMessageWithDedupeKey()
    {
        using var db = CreateDbContext();
        var publisher = new OutboxPublisher(db, Microsoft.Extensions.Logging.Abstractions.NullLogger<OutboxPublisher>.Instance);
        var tenantId = Guid.NewGuid();

        publisher.Enqueue(
            tenantId,
            OutboxMessageTypes.RegistrationConfirmation,
            """{"RegistrationId":"00000000-0000-0000-0000-000000000001"}""",
            "registration:test:confirmation");

        db.SaveChanges();

        var message = Assert.Single(db.OutboxMessages);
        Assert.Equal(tenantId, message.TenantId);
        Assert.Equal(OutboxMessageStatus.Pending, message.Status);
        Assert.Equal("registration:test:confirmation", message.DedupeKey);
    }

    [Fact]
    public void Enqueue_SkipsDuplicateDedupeKeyInSameUnitOfWork()
    {
        using var db = CreateDbContext();
        var publisher = new OutboxPublisher(db, Microsoft.Extensions.Logging.Abstractions.NullLogger<OutboxPublisher>.Instance);
        var tenantId = Guid.NewGuid();

        publisher.Enqueue(
            tenantId,
            OutboxMessageTypes.BillingNotification,
            """{"TenantId":"00000000-0000-0000-0000-000000000001"}""",
            "billing:test");

        publisher.Enqueue(
            tenantId,
            OutboxMessageTypes.BillingNotification,
            """{"TenantId":"00000000-0000-0000-0000-000000000002"}""",
            "billing:test");

        Assert.Equal(1, db.OutboxMessages.Local.Count);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
