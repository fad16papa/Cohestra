using System.Text.Json;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class TenantFormTemplateConfiguration : IEntityTypeConfiguration<TenantFormTemplate>
{
    public void Configure(EntityTypeBuilder<TenantFormTemplate> builder)
    {
        builder.ToTable("tenant_form_templates");

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

        builder.Property(template => template.FormSchema)
            .HasColumnName("form_schema")
            .HasColumnType("jsonb")
            .HasConversion(
                schema => JsonSerializer.Serialize(schema, ActivityFormSchemaJson.SerializerOptions),
                json => string.IsNullOrWhiteSpace(json)
                    ? new ActivityFormSchema()
                    : JsonSerializer.Deserialize<ActivityFormSchema>(
                        json,
                        ActivityFormSchemaJson.SerializerOptions) ?? new ActivityFormSchema());

        builder.Property(template => template.CreatedAt).IsRequired();
        builder.Property(template => template.UpdatedAt).IsRequired();

        builder.HasIndex(template => new { template.TenantId, template.Name });
    }
}
