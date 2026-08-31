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
                json => DeserializeFormTemplateSchema(json));

        builder.Property(template => template.CreatedAt).IsRequired();
        builder.Property(template => template.UpdatedAt).IsRequired();

        builder.HasIndex(template => new { template.TenantId, template.Name });
    }

    private static ActivityFormSchema DeserializeFormTemplateSchema(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new InvalidOperationException("Form template schema is missing.");
        }

        return JsonSerializer.Deserialize<ActivityFormSchema>(
                   json,
                   ActivityFormSchemaJson.SerializerOptions)
               ?? throw new InvalidOperationException("Form template schema is invalid.");
    }
}
