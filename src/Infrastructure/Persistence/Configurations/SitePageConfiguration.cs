using Cohestra.Domain.Tenants;
using System.Text.Json;
using Cohestra.Domain.Site;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class SitePageConfiguration : IEntityTypeConfiguration<SitePage>
{
    public void Configure(EntityTypeBuilder<SitePage> builder)
    {
        builder.ToTable("site_pages");

        builder.HasKey(page => page.Id);

        builder.Property(page => page.TenantId)
            .IsRequired();

        builder.HasIndex(page => page.TenantId)
            .IsUnique();

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(page => page.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(page => page.DraftSections)
            .HasColumnName("draft_sections_json")
            .HasColumnType("jsonb")
            .HasConversion(
                document => document == null
                    ? null
                    : JsonSerializer.Serialize(document, SiteSectionsDocumentJson.SerializerOptions),
                json => string.IsNullOrWhiteSpace(json)
                    ? null
                    : JsonSerializer.Deserialize<SiteSectionsDocument>(
                        json,
                        SiteSectionsDocumentJson.SerializerOptions));

        builder.Property(page => page.PublishedSections)
            .HasColumnName("published_sections_json")
            .HasColumnType("jsonb")
            .HasConversion(
                document => document == null
                    ? null
                    : JsonSerializer.Serialize(document, SiteSectionsDocumentJson.SerializerOptions),
                json => string.IsNullOrWhiteSpace(json)
                    ? null
                    : JsonSerializer.Deserialize<SiteSectionsDocument>(
                        json,
                        SiteSectionsDocumentJson.SerializerOptions));

        builder.Property(page => page.PreviousPublishedSections)
            .HasColumnName("previous_published_sections_json")
            .HasColumnType("jsonb")
            .HasConversion(
                document => document == null
                    ? null
                    : JsonSerializer.Serialize(document, SiteSectionsDocumentJson.SerializerOptions),
                json => string.IsNullOrWhiteSpace(json)
                    ? null
                    : JsonSerializer.Deserialize<SiteSectionsDocument>(
                        json,
                        SiteSectionsDocumentJson.SerializerOptions));

        builder.Property(page => page.PreviousPublishedAt)
            .HasColumnType("timestamp with time zone");

        builder.Property(page => page.DraftUpdatedAt).IsRequired();
        builder.Property(page => page.SchemaVersion).HasDefaultValue(1);
    }
}
