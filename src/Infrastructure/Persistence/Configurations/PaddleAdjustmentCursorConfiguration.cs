using Cohestra.Domain.Billing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class PaddleAdjustmentCursorConfiguration : IEntityTypeConfiguration<PaddleAdjustmentCursor>
{
    public const string PrimaryKeyName = "PK_paddle_adjustment_cursors";

    public void Configure(EntityTypeBuilder<PaddleAdjustmentCursor> builder)
    {
        builder.ToTable("paddle_adjustment_cursors");

        builder.HasKey(cursor => cursor.AdjustmentId)
            .HasName(PrimaryKeyName);

        builder.Property(cursor => cursor.AdjustmentId)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(cursor => cursor.OccurredAt)
            .IsRequired();

        builder.Property(cursor => cursor.Status)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(cursor => cursor.Action)
            .HasMaxLength(32)
            .IsRequired();
    }
}
