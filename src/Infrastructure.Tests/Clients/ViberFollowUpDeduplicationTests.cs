using Cohestra.Application.Clients;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Clients;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ViberFollowUpDeduplicationTests
{
    [Fact]
    public void EnsureViberFollowUpIsNotDuplicate_ThrowsWhenRecentMatch()
    {
        var now = DateTimeOffset.UtcNow;
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Test Client",
            TimelineEvents =
            [
                new ClientTimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ClientId = Guid.NewGuid(),
                    EventType = ClientTimelineEventType.ViberFollowUpRecorded,
                    OccurredAt = now.AddMinutes(-1),
                    Subject = "Contacted",
                    Note = "Same note",
                },
            ],
        };

        Assert.Throws<DuplicateViberFollowUpException>(() =>
            ClientService.EnsureViberFollowUpIsNotDuplicate(
                client,
                "Contacted",
                "Same note"));
    }

    [Fact]
    public void EnsureViberFollowUpIsNotDuplicate_AllowsDifferentStatus()
    {
        var now = DateTimeOffset.UtcNow;
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Test Client",
            TimelineEvents =
            [
                new ClientTimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ClientId = Guid.NewGuid(),
                    EventType = ClientTimelineEventType.ViberFollowUpRecorded,
                    OccurredAt = now.AddMinutes(-1),
                    Subject = "Contacted",
                    Note = null,
                },
            ],
        };

        ClientService.EnsureViberFollowUpIsNotDuplicate(
            client,
            "Awaiting reply",
            null);
    }

    [Fact]
    public void EnsureViberFollowUpIsNotDuplicate_AllowsIdenticalAfterCooldown()
    {
        var now = DateTimeOffset.UtcNow;
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Test Client",
            TimelineEvents =
            [
                new ClientTimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ClientId = Guid.NewGuid(),
                    EventType = ClientTimelineEventType.ViberFollowUpRecorded,
                    OccurredAt = now.AddMinutes(-16),
                    Subject = "Contacted",
                    Note = "Old note",
                },
            ],
        };

        ClientService.EnsureViberFollowUpIsNotDuplicate(
            client,
            "Contacted",
            "Old note");
    }

    [Fact]
    public void EnsureViberFollowUpIsNotDuplicate_IgnoresRecentWhatsAppMatch()
    {
        var now = DateTimeOffset.UtcNow;
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Test Client",
            TimelineEvents =
            [
                new ClientTimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ClientId = Guid.NewGuid(),
                    EventType = ClientTimelineEventType.WhatsAppFollowUpRecorded,
                    OccurredAt = now.AddMinutes(-1),
                    Subject = "Contacted",
                    Note = "Same note",
                },
            ],
        };

        ClientService.EnsureViberFollowUpIsNotDuplicate(
            client,
            "Contacted",
            "Same note");
    }
}
