using LeadGenerationCrm.Application.Clients;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Infrastructure.Clients;

namespace LeadGenerationCrm.Infrastructure.Tests.Clients;

public sealed class WhatsAppFollowUpDeduplicationTests
{
    [Fact]
    public void EnsureWhatsAppFollowUpIsNotDuplicate_ThrowsWhenRecentMatch()
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

        Assert.Throws<DuplicateWhatsAppFollowUpException>(() =>
            ClientService.EnsureWhatsAppFollowUpIsNotDuplicate(
                client,
                "Contacted",
                "Same note"));
    }

    [Fact]
    public void EnsureWhatsAppFollowUpIsNotDuplicate_AllowsDifferentStatus()
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
                    Note = null,
                },
            ],
        };

        ClientService.EnsureWhatsAppFollowUpIsNotDuplicate(
            client,
            "Awaiting reply",
            null);
    }

    [Fact]
    public void EnsureWhatsAppFollowUpIsNotDuplicate_AllowsIdenticalAfterCooldown()
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
                    OccurredAt = now.AddMinutes(-16),
                    Subject = "Contacted",
                    Note = "Old note",
                },
            ],
        };

        ClientService.EnsureWhatsAppFollowUpIsNotDuplicate(
            client,
            "Contacted",
            "Old note");
    }
}
