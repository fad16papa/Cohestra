using Cohestra.Domain.Tenants;
using Cohestra.Domain.Campaigns;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class CampaignAssetConfiguration : IEntityTypeConfiguration<CampaignAsset>
{
    public void Configure(EntityTypeBuilder<CampaignAsset> builder)
    {
        builder.ToTable("campaign_assets");

        builder.HasKey(asset => asset.Id);

        builder.Property(asset => asset.TenantId)
            .IsRequired();

        builder.HasIndex(asset => asset.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(asset => asset.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(asset => asset.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(asset => asset.ContentType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(asset => asset.RelativePath)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(asset => asset.AltText)
            .HasMaxLength(500);

        builder.Property(asset => asset.CreatedAt).IsRequired();
    }
}
