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

        builder.Property(tenant => tenant.PaddleCustomerId)
            .HasMaxLength(255);

        builder.Property(tenant => tenant.PaddleSubscriptionId)
            .HasMaxLength(255);

        builder.Property(tenant => tenant.PaddleSubscriptionScheduleId)
            .HasMaxLength(255);

        builder.Property(tenant => tenant.BillingInterval)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(tenant => tenant.ScheduledBillingInterval)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(tenant => tenant.HasConsumedTrial)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasIndex(tenant => tenant.PaddleCustomerId)
            .IsUnique()
            .HasFilter("\"PaddleCustomerId\" IS NOT NULL");

        builder.HasIndex(tenant => tenant.PaddleSubscriptionId)
            .IsUnique()
            .HasFilter("\"PaddleSubscriptionId\" IS NOT NULL");

        builder.Property(tenant => tenant.CreatedAt).IsRequired();
        builder.Property(tenant => tenant.UpdatedAt).IsRequired();

        builder.Property(tenant => tenant.LegalAcceptedAt);

        builder.Property(tenant => tenant.TermsVersion)
            .HasMaxLength(32);

        builder.Property(tenant => tenant.PrivacyVersion)
            .HasMaxLength(32);

        builder.Property(tenant => tenant.RegistrationTimeZoneId)
            .HasMaxLength(64)
            .IsRequired()
            .HasDefaultValue("UTC");

        builder.Property(tenant => tenant.EmailOnNewRegistration)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(tenant => tenant.CustomDomain)
            .HasMaxLength(253);

        builder.Property(tenant => tenant.CustomDomainVerifiedAt);

        builder.HasIndex(tenant => tenant.CustomDomain)
            .IsUnique()
            .HasFilter("\"CustomDomain\" IS NOT NULL");
    }
}
