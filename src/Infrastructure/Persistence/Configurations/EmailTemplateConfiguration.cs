using Cohestra.Domain.Tenants;
using Cohestra.Domain.Campaigns;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class EmailTemplateConfiguration : IEntityTypeConfiguration<EmailTemplate>
{
    public void Configure(EntityTypeBuilder<EmailTemplate> builder)
    {
        builder.ToTable("email_templates");

        builder.HasKey(template => template.Id);

        builder.Property(template => template.TenantId)
            .IsRequired();

        builder.HasIndex(template => template.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(template => template.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(template => template.Name)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(template => template.Subject)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(template => template.Body)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(template => template.BodyFormat)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(template => template.CreatedAt).IsRequired();
        builder.Property(template => template.UpdatedAt).IsRequired();

        builder.HasIndex(template => template.Name);
    }
}
