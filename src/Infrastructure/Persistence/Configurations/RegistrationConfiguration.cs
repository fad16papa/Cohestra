using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LeadGenerationCrm.Infrastructure.Persistence.Configurations;

internal sealed class RegistrationConfiguration : IEntityTypeConfiguration<Registration>
{
    public void Configure(EntityTypeBuilder<Registration> builder)
    {
        builder.ToTable("registrations");

        builder.HasKey(registration => registration.Id);

        builder.Property(registration => registration.RegistrationNumber)
            .HasColumnName("registration_number")
            .HasMaxLength(17)
            .IsRequired();

        builder.Property(registration => registration.Answers)
            .HasColumnName("answers")
            .HasColumnType("jsonb")
            .HasConversion(
                answers => RegistrationAnswersJson.Serialize(answers),
                json => RegistrationAnswersJson.Deserialize(json))
            .IsRequired();

        builder.Property(registration => registration.CreatedAt).IsRequired();

        builder.HasIndex(registration => registration.RegistrationNumber)
            .IsUnique();

        builder.HasIndex(registration => new { registration.ClientId, registration.ActivityId })
            .IsUnique();

        builder.HasIndex(registration => registration.ActivityId);
        builder.HasIndex(registration => registration.ClientId);
        builder.HasIndex(registration => registration.CreatedAt);

        builder.HasOne(registration => registration.Activity)
            .WithMany()
            .HasForeignKey(registration => registration.ActivityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(registration => registration.Client)
            .WithMany(client => client.Registrations)
            .HasForeignKey(registration => registration.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
