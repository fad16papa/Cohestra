using LeadGenerationCrm.Domain.Campaigns;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LeadGenerationCrm.Infrastructure.Persistence.Configurations;

internal sealed class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        builder.ToTable("campaigns");

        builder.HasKey(campaign => campaign.Id);

        builder.Property(campaign => campaign.Subject)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(campaign => campaign.Body)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(campaign => campaign.BodyFormat)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(campaign => campaign.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(campaign => campaign.CreatedAt).IsRequired();
        builder.Property(campaign => campaign.SentAt).IsRequired();

        builder.HasOne(campaign => campaign.EmailTemplate)
            .WithMany()
            .HasForeignKey(campaign => campaign.EmailTemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(campaign => campaign.SentAt);
    }
}
