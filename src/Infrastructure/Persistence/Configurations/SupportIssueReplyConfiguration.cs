using Cohestra.Domain.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cohestra.Infrastructure.Persistence.Configurations;

internal sealed class SupportIssueReplyConfiguration : IEntityTypeConfiguration<SupportIssueReply>
{
    public void Configure(EntityTypeBuilder<SupportIssueReply> builder)
    {
        builder.ToTable("support_issue_replies");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.ActorEmail)
            .HasMaxLength(320);

        builder.Property(item => item.Body)
            .HasMaxLength(8000)
            .IsRequired();

        builder.HasIndex(item => item.SupportIssueId);

        builder.HasOne(item => item.SupportIssue)
            .WithMany(issue => issue.Replies)
            .HasForeignKey(item => item.SupportIssueId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
