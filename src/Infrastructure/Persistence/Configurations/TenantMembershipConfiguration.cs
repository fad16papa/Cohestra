using Cohestra.Domain.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class TenantMembershipConfiguration : IEntityTypeConfiguration<TenantMembership>
{
    public void Configure(EntityTypeBuilder<TenantMembership> builder)
    {
        builder.ToTable("tenant_memberships");

        builder.HasKey(membership => membership.Id);

        builder.Property(membership => membership.UserId).IsRequired();
        builder.Property(membership => membership.TenantId).IsRequired();

        builder.Property(membership => membership.Role)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(membership => membership.CreatedAt).IsRequired();
        builder.Property(membership => membership.UpdatedAt).IsRequired();

        builder.HasIndex(membership => new { membership.UserId, membership.TenantId })
            .IsUnique();

        builder.HasIndex(membership => membership.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(membership => membership.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
