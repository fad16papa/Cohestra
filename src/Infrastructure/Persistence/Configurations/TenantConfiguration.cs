using Cohestra.Domain.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");

        builder.HasKey(tenant => tenant.Id);

        builder.Property(tenant => tenant.Slug)
            .HasMaxLength(48)
            .IsRequired();

        builder.HasIndex(tenant => tenant.Slug)
            .IsUnique();

        builder.Property(tenant => tenant.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(tenant => tenant.AdminContactEmail)
            .HasMaxLength(320);

        builder.Property(tenant => tenant.Plan)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(tenant => tenant.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(tenant => tenant.BillingStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(tenant => tenant.IsComplimentary)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(tenant => tenant.StripeCustomerId)
            .HasMaxLength(255);

        builder.Property(tenant => tenant.StripeSubscriptionId)
            .HasMaxLength(255);

        builder.Property(tenant => tenant.BillingInterval)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(tenant => tenant.HasConsumedTrial)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasIndex(tenant => tenant.StripeCustomerId)
            .IsUnique()
            .HasFilter("\"StripeCustomerId\" IS NOT NULL");

        builder.HasIndex(tenant => tenant.StripeSubscriptionId)
            .IsUnique()
            .HasFilter("\"StripeSubscriptionId\" IS NOT NULL");

        builder.Property(tenant => tenant.CreatedAt).IsRequired();
        builder.Property(tenant => tenant.UpdatedAt).IsRequired();

        builder.Property(tenant => tenant.LegalAcceptedAt);

        builder.Property(tenant => tenant.TermsVersion)
            .HasMaxLength(32);

        builder.Property(tenant => tenant.PrivacyVersion)
            .HasMaxLength(32);
    }
}
