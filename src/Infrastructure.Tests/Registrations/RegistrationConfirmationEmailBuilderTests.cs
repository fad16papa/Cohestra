using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationConfirmationEmailBuilderTests
{
    private static RegistrationConfirmationEmailModel CreateModel(
        string? logoUrl = "https://example.com/brand/logo.png",
        string? heroImageUrl = null) =>
        new(
            ParticipantName: "Elena Santos",
            ActivityName: "Sunday Pickleball Clinic",
            Schedule: "Sun 9:00 AM – 11:00 AM",
            Location: "Ikigai Studio, Makati",
            CommunityLabel: "Ikigai",
            RegistrationNumber: "REG20260616000042",
            BrandName: "Creativorare",
            FooterLegalName: "Creativorare",
            WebsiteUrl: "https://creativorare.com",
            LogoUrl: logoUrl,
            HeroImageUrl: heroImageUrl);

    [Fact]
    public void Build_IncludesRegistrationNumberAndNoReplyFooter()
    {
        var content = RegistrationConfirmationEmailBuilder.Build(CreateModel());

        Assert.Contains("You're registered — Sunday Pickleball Clinic", content.Subject);
        Assert.Contains("REG20260616000042", content.PlainTextBody);
        Assert.Contains("Please do not reply", content.PlainTextBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Please do not reply", content.HtmlBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("REG20260616000042", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesLogoWhenProvided()
    {
        var content = RegistrationConfirmationEmailBuilder.Build(CreateModel());

        Assert.Contains("https://example.com/brand/logo.png", content.HtmlBody);
        Assert.Contains("alt=\"Creativorare\"", content.HtmlBody);
    }

    [Fact]
    public void Build_UsesTextBrandWhenLogoMissing()
    {
        var content = RegistrationConfirmationEmailBuilder.Build(CreateModel(logoUrl: null));

        Assert.DoesNotContain("<img", content.HtmlBody);
        Assert.Contains("Creativorare", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesHeroImageWhenProvided()
    {
        const string heroUrl = "https://cdn.example.com/activities/pickleball-hero.jpg";
        var content = RegistrationConfirmationEmailBuilder.Build(
            CreateModel(heroImageUrl: heroUrl));

        Assert.Contains(heroUrl, content.HtmlBody);
        Assert.DoesNotContain("background-color:#000000", content.HtmlBody);
    }

    [Fact]
    public void Build_UsesLogoHeaderWhenHeroMissing()
    {
        var content = RegistrationConfirmationEmailBuilder.Build(CreateModel());

        Assert.Contains("background-color:#000000", content.HtmlBody);
        Assert.Contains("https://example.com/brand/logo.png", content.HtmlBody);
    }

    [Fact]
    public void ResolveLogoUrl_UsesPublicWebBaseWhenLogoUrlNotConfigured()
    {
        var url = RegistrationNotificationService.ResolveLogoUrl(
            new EmailBrandingSettings(),
            new PublicWebOptions { BaseUrl = "http://localhost:3000" });

        Assert.Equal("http://localhost:3000/brand/creativorare-logo.png", url);
    }
}
