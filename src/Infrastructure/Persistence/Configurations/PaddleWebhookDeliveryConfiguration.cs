using Cohestra.Domain.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class PaddleWebhookDeliveryConfiguration : IEntityTypeConfiguration<PaddleWebhookDelivery>
{
    public void Configure(EntityTypeBuilder<PaddleWebhookDelivery> builder)
    {
        builder.ToTable("paddle_webhook_deliveries");

        builder.HasKey(row => row.Id);

        builder.Property(row => row.EventId)
            .HasMaxLength(255);

        builder.Property(row => row.EventType)
            .HasMaxLength(128);

        builder.Property(row => row.Disposition)
            .IsRequired();

        builder.Property(row => row.HttpStatus)
            .IsRequired();

        builder.Property(row => row.DetailSanitized)
            .HasMaxLength(200);

        builder.Property(row => row.ObservedAt)
            .IsRequired();

        builder.HasIndex(row => new { row.ObservedAt, row.Id });
        builder.HasIndex(row => row.Disposition);
        builder.HasIndex(row => row.TenantId);
        builder.HasIndex(row => row.EventType);
    }
}
