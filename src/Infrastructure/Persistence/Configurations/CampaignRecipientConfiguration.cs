using Cohestra.Domain.Tenants;
using Cohestra.Domain.Campaigns;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class CampaignRecipientConfiguration : IEntityTypeConfiguration<CampaignRecipient>
{
    public void Configure(EntityTypeBuilder<CampaignRecipient> builder)
    {
        builder.ToTable("campaign_recipients");

        builder.HasKey(recipient => recipient.Id);

        builder.Property(recipient => recipient.TenantId)
            .IsRequired();

        builder.HasIndex(recipient => recipient.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(recipient => recipient.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(recipient => recipient.Email)
            .HasMaxLength(320);

        builder.Property(recipient => recipient.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(recipient => recipient.FailureReason)
            .HasMaxLength(500);

        builder.Property(recipient => recipient.ProviderMessageId)
            .HasMaxLength(120);

        builder.HasOne(recipient => recipient.Campaign)
            .WithMany(campaign => campaign.Recipients)
            .HasForeignKey(recipient => recipient.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(recipient => recipient.Client)
            .WithMany()
            .HasForeignKey(recipient => recipient.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(recipient => new { recipient.CampaignId, recipient.ClientId })
            .IsUnique();
    }
}
