using Cohestra.Domain.Clients;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.ToTable("clients");

        builder.HasKey(client => client.Id);

        builder.Property(client => client.FullName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(client => client.Phone)
            .HasMaxLength(50);

        builder.Property(client => client.NormalizedPhone)
            .HasMaxLength(50);

        builder.HasIndex(client => client.NormalizedPhone)
            .IsUnique()
            .HasFilter("\"NormalizedPhone\" IS NOT NULL");

        builder.Property(client => client.Email)
            .HasMaxLength(320);

        builder.Property(client => client.NormalizedEmail)
            .HasMaxLength(320);

        builder.HasIndex(client => client.NormalizedEmail)
            .IsUnique()
            .HasFilter("\"NormalizedEmail\" IS NOT NULL");

        builder.Property(client => client.Profession)
            .HasMaxLength(200);

        builder.Property(client => client.Nationality)
            .HasMaxLength(100);

        builder.Property(client => client.Residency)
            .HasMaxLength(100);

        builder.Property(client => client.ReferralSource)
            .HasMaxLength(100);

        builder.Property(client => client.Notes)
            .HasMaxLength(4000);

        builder.Property(client => client.LeadStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(client => client.LeadStatus);

        builder.Property(client => client.IsMergeSuspect).IsRequired();
        builder.Property(client => client.ConsentGiven).IsRequired();
        builder.Property(client => client.CreatedAt).IsRequired();
        builder.Property(client => client.UpdatedAt).IsRequired();
    }
}
