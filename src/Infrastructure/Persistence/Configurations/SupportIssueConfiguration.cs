using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class SupportIssueConfiguration : IEntityTypeConfiguration<SupportIssue>
{
    public void Configure(EntityTypeBuilder<SupportIssue> builder)
    {
        builder.ToTable("support_issues");

        builder.HasKey(issue => issue.Id);

        builder.Property(issue => issue.TenantId)
            .IsRequired();

        builder.HasIndex(issue => issue.TenantId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(issue => issue.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(issue => issue.IssueNumber)
            .HasColumnName("issue_number")
            .HasMaxLength(17)
            .IsRequired();

        builder.HasIndex(issue => issue.IssueNumber)
            .IsUnique();

        builder.Property(issue => issue.Subject)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(issue => issue.Description)
            .HasMaxLength(5000)
            .IsRequired();

        builder.Property(issue => issue.Status)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(issue => issue.OperatorEmail)
            .HasMaxLength(320)
            .IsRequired();

        builder.Property(issue => issue.OperatorDisplayName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(issue => issue.TenantSlug)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(issue => issue.TenantName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(issue => issue.Plan)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(issue => issue.UserAgent)
            .HasMaxLength(512);

        builder.Property(issue => issue.InternalNote)
            .HasMaxLength(4000);

        builder.Property(issue => issue.CreatedAt).IsRequired();
        builder.Property(issue => issue.UpdatedAt).IsRequired();

        builder.HasIndex(issue => new { issue.TenantId, issue.SubmittedByUserId, issue.CreatedAt });
        builder.HasIndex(issue => issue.CreatedAt);

        builder.HasMany(issue => issue.Attachments)
            .WithOne(attachment => attachment.SupportIssue)
            .HasForeignKey(attachment => attachment.SupportIssueId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class SupportIssueAttachmentConfiguration : IEntityTypeConfiguration<SupportIssueAttachment>
{
    public void Configure(EntityTypeBuilder<SupportIssueAttachment> builder)
    {
        builder.ToTable("support_issue_attachments");

        builder.HasKey(attachment => attachment.Id);

        builder.Property(attachment => attachment.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(attachment => attachment.ContentType)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(attachment => attachment.RelativePath)
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(attachment => attachment.CreatedAt).IsRequired();

        builder.HasIndex(attachment => attachment.SupportIssueId);
    }
}
