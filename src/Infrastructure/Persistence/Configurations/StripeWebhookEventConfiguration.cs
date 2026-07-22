using Cohestra.Domain.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class StripeWebhookEventConfiguration : IEntityTypeConfiguration<StripeWebhookEvent>
{
    public void Configure(EntityTypeBuilder<StripeWebhookEvent> builder)
    {
        builder.ToTable("stripe_webhook_events");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.EventId)
            .HasMaxLength(255)
            .IsRequired();

        builder.HasIndex(e => e.EventId)
            .IsUnique();

        builder.Property(e => e.EventType)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(e => e.ProcessedAt)
            .IsRequired();
    }
}
