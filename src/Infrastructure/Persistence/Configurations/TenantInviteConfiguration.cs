using Cohestra.Domain.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class TenantInviteConfiguration : IEntityTypeConfiguration<TenantInvite>
{
    public void Configure(EntityTypeBuilder<TenantInvite> builder)
    {
        builder.ToTable("tenant_invites");

        builder.HasKey(invite => invite.Id);

        builder.Property(invite => invite.Email)
            .HasMaxLength(320)
            .IsRequired();

        builder.Property(invite => invite.Role)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(invite => invite.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(invite => invite.InvitedByUserId).IsRequired();
        builder.Property(invite => invite.ExpiresAt).IsRequired();
        builder.Property(invite => invite.CreatedAt).IsRequired();

        builder.HasIndex(invite => invite.TokenHash).IsUnique();
        builder.HasIndex(invite => new { invite.TenantId, invite.Email });

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(invite => invite.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
