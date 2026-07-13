using LeadGenerationCrm.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LeadGenerationCrm.Infrastructure.Persistence.Configurations;

public sealed class CommunityConfiguration : IEntityTypeConfiguration<Community>
{
    public void Configure(EntityTypeBuilder<Community> builder)
    {
        builder.ToTable("communities");

        builder.HasKey(community => community.Id);

        builder.Property(community => community.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(community => community.Name)
            .IsUnique();

        builder.Property(community => community.CreatedAt).IsRequired();
        builder.Property(community => community.UpdatedAt).IsRequired();
    }
}
