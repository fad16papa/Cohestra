using Cohestra.Domain.Tenants;
using System.Text.Json;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("activities");

        builder.HasKey(activity => activity.Id);

        builder.Property(activity => activity.TenantId)
            .IsRequired();

        builder.HasIndex(activity => activity.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(activity => activity.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(activity => activity.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(activity => activity.Slug)
            .HasMaxLength(220)
            .IsRequired();

        builder.HasIndex(activity => new { activity.TenantId, activity.Slug })
            .IsUnique();

        builder.Property(activity => activity.Category)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(activity => activity.Schedule)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(activity => activity.Location)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(activity => activity.CommunityLabel)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(activity => activity.HeroImageUrl)
            .HasMaxLength(2048);

        builder.Property(activity => activity.AccentColor)
            .HasMaxLength(7);

        builder.Property(activity => activity.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(activity => activity.Status);
        builder.HasIndex(activity => activity.Category);

        builder.Property(activity => activity.FormSchema)
            .HasColumnName("form_schema")
            .HasColumnType("jsonb")
            .HasConversion(
                schema => schema == null
                    ? null
                    : JsonSerializer.Serialize(schema, ActivityFormSchemaJson.SerializerOptions),
                json => string.IsNullOrWhiteSpace(json)
                    ? null
                    : JsonSerializer.Deserialize<ActivityFormSchema>(
                        json,
                        ActivityFormSchemaJson.SerializerOptions));

        builder.Property(activity => activity.ShowOnHomepage)
            .HasColumnName("show_on_homepage")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(activity => activity.CreatedAt).IsRequired();
        builder.Property(activity => activity.UpdatedAt).IsRequired();
    }
}
