using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Support;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueConfirmationEmailBuilderTests
{
    [Fact]
    public void Build_IncludesBrandedFooterWithCurrentYear()
    {
        var submittedAt = new DateTimeOffset(2026, 8, 20, 9, 30, 0, TimeSpan.Zero);
        var content = SupportIssueConfirmationEmailTemplate.Build(CreateModel(submittedAt));

        Assert.Contains("Cohestra by Creativorare © 2026", content.PlainTextBody);
        Assert.Contains("Cohestra by Creativorare © 2026", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesSupportIdSubjectAndDescription()
    {
        var content = SupportIssueConfirmationEmailTemplate.Build(CreateModel());

        Assert.Equal("We received your support request — SUP20260820810354", content.Subject);
        Assert.Contains("SUP20260820810354", content.PlainTextBody);
        Assert.Contains("Login issue on mobile", content.PlainTextBody);
        Assert.Contains("Cannot sign in from Safari on iPhone.", content.PlainTextBody);
        Assert.Contains("SUP20260820810354", content.HtmlBody);
        Assert.Contains("Login issue on mobile", content.HtmlBody);
    }

    [Fact]
    public void Build_UsesFriendlyGreetingWhenDisplayNameIsEmail()
    {
        var content = SupportIssueConfirmationEmailTemplate.Build(
            CreateModel() with
            {
                GreetingName = SupportIssueConfirmationEmailTemplate.ResolveGreetingName(
                    "operator@example.com",
                    "operator@example.com"),
            });

        Assert.Contains("Hi there,", content.PlainTextBody);
        Assert.Contains("Hi there,", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesRequestSummaryAndNextSteps()
    {
        var content = SupportIssueConfirmationEmailTemplate.Build(
            CreateModel() with { AttachmentCount = 2 });

        Assert.Contains("Demo Org (demo)", content.PlainTextBody);
        Assert.Contains("Attachments: 2 files received", content.PlainTextBody);
        Assert.Contains("What happens next", content.PlainTextBody);
        Assert.Contains("Settings → Help & support", content.PlainTextBody);
        Assert.Contains("Request summary", content.HtmlBody);
        Assert.Contains("2 files received", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesLogoWhenProvided()
    {
        var content = SupportIssueConfirmationEmailTemplate.Build(
            CreateModel() with { LogoUrl = "cid:cohestra-brand-logo" });

        Assert.Contains("cid:cohestra-brand-logo", content.HtmlBody);
        Assert.Contains("alt=\"Cohestra\"", content.HtmlBody);
    }

    [Fact]
    public void EmailBuilder_AttachesOfficialLogoInline()
    {
        var builder = new SupportIssueConfirmationEmailBuilder(
            Options.Create(new SendGridSettings
            {
                FromEmail = "noreply@creativorare.com",
                FromName = "Cohestra",
            }),
            Options.Create(new EmailBrandingSettings()),
            Options.Create(new PublicWebOptions { BaseUrl = "https://cohestra.app" }));

        var email = builder.Build(CreateIssue());

        Assert.Contains("cid:cohestra-brand-logo", email.HtmlBody);
        var attachment = Assert.Single(email.InlineAttachments!);
        Assert.Equal(PlatformBrandAssets.LogoInlineContentId, attachment.ContentId);
        Assert.Equal("image/png", attachment.ContentType);
        Assert.NotEmpty(attachment.Content);
    }

    private static SupportIssue CreateIssue() =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = Guid.CreateVersion7(),
            IssueNumber = "SUP20260820810354",
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Login issue on mobile",
            Description = "Cannot sign in from Safari on iPhone.",
            OperatorEmail = "operator@example.com",
            OperatorDisplayName = "Alex",
            TenantSlug = "demo",
            TenantName = "Demo Org",
            Plan = TenantPlan.Core,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

    private static SupportIssueConfirmationEmailModel CreateModel(
        DateTimeOffset? submittedAt = null) =>
        new(
            GreetingName: "Alex",
            IssueNumber: "SUP20260820810354",
            Subject: "Login issue on mobile",
            Description: "Cannot sign in from Safari on iPhone.",
            TenantName: "Demo Org",
            TenantSlug: "demo",
            OperatorEmail: "operator@example.com",
            SubmittedAtUtc: submittedAt ?? new DateTimeOffset(2026, 8, 20, 9, 30, 0, TimeSpan.Zero),
            AttachmentCount: 0,
            LogoUrl: null,
            WebsiteUrl: "https://cohestra.app");
}
