using Cohestra.Domain.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages");

        builder.HasKey(message => message.Id);

        builder.Property(message => message.TenantId)
            .IsRequired();

        builder.Property(message => message.MessageType)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(message => message.PayloadJson)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(message => message.DedupeKey)
            .HasMaxLength(256);

        builder.HasIndex(message => message.DedupeKey)
            .IsUnique()
            .HasFilter("\"DedupeKey\" IS NOT NULL AND \"Status\" <> 'Failed'");

        builder.Property(message => message.ClaimedAt);

        builder.Property(message => message.DispatchedAt);

        builder.Property(message => message.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(message => message.AttemptCount)
            .IsRequired();

        builder.Property(message => message.CreatedAt)
            .IsRequired();

        builder.Property(message => message.NextAttemptAt)
            .IsRequired();

        builder.Property(message => message.LastError)
            .HasMaxLength(2000);

        builder.HasIndex(message => new { message.Status, message.NextAttemptAt, message.CreatedAt });
        builder.HasIndex(message => message.TenantId);
    }
}
