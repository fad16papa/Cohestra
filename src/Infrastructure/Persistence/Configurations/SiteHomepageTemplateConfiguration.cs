using System.Text.Json;
using Cohestra.Domain.Site;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class SiteHomepageTemplateConfiguration : IEntityTypeConfiguration<SiteHomepageTemplate>
{
    public void Configure(EntityTypeBuilder<SiteHomepageTemplate> builder)
    {
        builder.ToTable("site_homepage_templates");

        builder.HasKey(template => template.Id);

        builder.Property(template => template.Name)
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(template => template.Sections)
            .HasColumnName("sections_json")
            .HasColumnType("jsonb")
            .HasConversion(
                sections => JsonSerializer.Serialize(sections, SiteSectionsDocumentJson.SerializerOptions),
                json => DeserializeSections(json));

        builder.Property(template => template.CreatedAt).IsRequired();
        builder.Property(template => template.UpdatedAt).IsRequired();
    }

    private static List<SiteSection> DeserializeSections(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        return JsonSerializer.Deserialize<List<SiteSection>>(
            json,
            SiteSectionsDocumentJson.SerializerOptions) ?? [];
    }
}
