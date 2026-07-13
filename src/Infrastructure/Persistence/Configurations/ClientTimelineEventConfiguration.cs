using LeadGenerationCrm.Domain.Clients;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LeadGenerationCrm.Infrastructure.Persistence.Configurations;

internal sealed class ClientTimelineEventConfiguration : IEntityTypeConfiguration<ClientTimelineEvent>
{
    public void Configure(EntityTypeBuilder<ClientTimelineEvent> builder)
    {
        builder.ToTable("client_timeline_events");

        builder.HasKey(timelineEvent => timelineEvent.Id);

        builder.Property(timelineEvent => timelineEvent.EventType)
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(timelineEvent => timelineEvent.PreviousLeadStatus)
            .HasMaxLength(20);

        builder.Property(timelineEvent => timelineEvent.NewLeadStatus)
            .HasMaxLength(20);

        builder.Property(timelineEvent => timelineEvent.Subject)
            .HasMaxLength(200);

        builder.Property(timelineEvent => timelineEvent.Note)
            .HasMaxLength(500);

        builder.Property(timelineEvent => timelineEvent.OccurredAt).IsRequired();

        builder.HasIndex(timelineEvent => new { timelineEvent.ClientId, timelineEvent.OccurredAt });

        builder.HasOne(timelineEvent => timelineEvent.Client)
            .WithMany(client => client.TimelineEvents)
            .HasForeignKey(timelineEvent => timelineEvent.ClientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
