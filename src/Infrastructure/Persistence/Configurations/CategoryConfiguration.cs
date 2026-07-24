using Cohestra.Domain.Tenants;
using Cohestra.Domain.Activities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.HasKey(category => category.Id);

        builder.Property(category => category.TenantId)
            .IsRequired();

        builder.HasIndex(category => category.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(category => category.TenantId)
            .OnDelete(DeleteBehavior.Restrict);


        builder.Property(category => category.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(category => new { category.TenantId, category.Name })
            .IsUnique();

        builder.Property(category => category.CreatedAt).IsRequired();
        builder.Property(category => category.UpdatedAt).IsRequired();
    }
}
