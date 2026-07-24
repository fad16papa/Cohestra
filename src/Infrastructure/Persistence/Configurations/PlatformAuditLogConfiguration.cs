using Cohestra.Domain.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class PlatformAuditLogConfiguration : IEntityTypeConfiguration<PlatformAuditLog>
{
    public void Configure(EntityTypeBuilder<PlatformAuditLog> builder)
    {
        builder.ToTable("platform_audit_logs");

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.ActorUserId).IsRequired();
        builder.Property(entry => entry.TenantId).IsRequired();

        builder.Property(entry => entry.Action)
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(entry => entry.Reason)
            .HasMaxLength(1000);

        builder.Property(entry => entry.DetailsJson)
            .HasColumnType("jsonb");

        builder.Property(entry => entry.CreatedAt).IsRequired();

        builder.HasIndex(entry => entry.TenantId);
        builder.HasIndex(entry => entry.CreatedAt);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(entry => entry.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
