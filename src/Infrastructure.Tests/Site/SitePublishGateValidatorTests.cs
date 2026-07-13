using System.Text.Json;
using Cohestra.Domain.Site;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Site;

public sealed class SitePublishGateValidatorTests
{
    [Fact]
    public void ValidateForPublishAsync_RejectsEmptyEnabledSections()
    {
        var draft = new SiteSectionsDocument
        {
            SchemaVersion = 1,
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = false,
                    Order = 0,
                    Props = JsonDocument.Parse("""{"headline":"Hello"}""").RootElement,
                },
            ],
        };

        var error = ValidateSync(draft);

        Assert.Equal("At least one section must be enabled to publish.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsMissingHeroHeadline()
    {
        var draft = new SiteSectionsDocument
        {
            SchemaVersion = 1,
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = true,
                    Order = 0,
                    Props = JsonDocument.Parse("""{"headline":""}""").RootElement,
                },
            ],
        };

        var error = ValidateSync(draft);

        Assert.Equal("Hero headline is required to publish.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_AcceptsValidHeroSection()
    {
        var draft = ValidDraft();

        var error = ValidateSync(draft);

        Assert.Null(error);
    }

    [Fact]
    public void TryGetHeroHeadline_ReadsHeadlineFromProps()
    {
        var props = JsonDocument.Parse("""{"headline":"Community activities"}""").RootElement;

        var headline = SitePublishGateValidator.TryGetHeroHeadline(props);

        Assert.Equal("Community activities", headline);
    }

    [Fact]
    public void GetCtaTargets_ReadsPrimaryAndSecondaryTargets()
    {
        var props = JsonDocument.Parse(
            """
            {
              "primaryCta": { "label": "Browse", "target": "scroll-upcoming" },
              "secondaryCta": { "label": "Sign in", "target": "/login" }
            }
            """).RootElement;

        var targets = SitePublishGateValidator.GetCtaTargets(props).ToList();

        Assert.Equal(["scroll-upcoming", "/login"], targets);
    }

    [Fact]
    public async Task ValidateForPublishAsync_RejectsUnpublishedActivityCta()
    {
        await using var dbContext = CreateDbContext();
        var slug = "draft-only-activity";
        var now = DateTimeOffset.UtcNow;

        dbContext.Activities.Add(new Domain.Activities.Activity
        {
            Id = Guid.NewGuid(),
            Name = "Draft Activity",
            Slug = slug,
            Category = "Test",
            Schedule = "Saturday",
            Location = "Test Court",
            CommunityLabel = "Test",
            Status = Domain.Activities.ActivityStatus.Draft,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var draft = ValidDraftWithActivityCta(slug);
        var validator = new SitePublishGateValidator(dbContext);
        var error = await validator.ValidateForPublishAsync(draft);

        Assert.NotNull(error);
        Assert.Contains("unpublished or missing activity", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsEmptyCarousel()
    {
        var draft = ValidDraftWithSection(
            "carousel-1",
            "carousel",
            """
            {
              "title": "Featured",
              "slides": [{ "headline": "", "imageAssetId": "" }]
            }
            """);

        var error = ValidateSync(draft);

        Assert.Equal("carousel: add at least one slide with an image or headline.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsEmptyTestimonials()
    {
        var draft = ValidDraftWithSection(
            "testimonials-1",
            "testimonials",
            """
            {
              "title": "What members say",
              "items": [{ "quote": "" }]
            }
            """);

        var error = ValidateSync(draft);

        Assert.Equal("testimonials: add at least one testimonial quote.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsEmptyFaq()
    {
        var draft = ValidDraftWithSection(
            "faq-1",
            "faq",
            """
            {
              "title": "Questions",
              "items": [{ "question": "", "answer": "No account needed." }]
            }
            """);

        var error = ValidateSync(draft);

        Assert.Equal("faq: add at least one FAQ question.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsEmptyStats()
    {
        var draft = ValidDraftWithSection(
            "stats-1",
            "stats",
            """
            {
              "items": [{ "value": "", "label": "Registrations" }]
            }
            """);

        var error = ValidateSync(draft);

        Assert.Equal("stats: add at least one stat value.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_RejectsMissingCtaBandHeadline()
    {
        var draft = ValidDraftWithSection(
            "cta-band-1",
            "ctaBand",
            """
            {
              "headline": "",
              "primaryCta": { "label": "See events", "target": "scroll-upcoming" }
            }
            """);

        var error = ValidateSync(draft);

        Assert.Equal("ctaBand: headline is required.", error);
    }

    [Fact]
    public void ValidateForPublishAsync_AcceptsValidMarketingSections()
    {
        var draft = ValidDraftWithSection(
            "carousel-1",
            "carousel",
            """
            {
              "title": "Featured",
              "slides": [{ "headline": "Summer social", "imageAssetId": "" }]
            }
            """);

        var error = ValidateSync(draft);

        Assert.Null(error);
    }

    [Fact]
    public void GetSectionCtaTargets_ReadsCarouselSlideTargets()
    {
        using var propsDocument = JsonDocument.Parse(
            """
            {
              "slides": [
                {
                  "headline": "Event",
                  "cta": { "label": "Register", "target": "activity:summer-social" }
                }
              ]
            }
            """);

        var section = new SiteSection
        {
            Id = "carousel-1",
            Type = "carousel",
            Enabled = true,
            Order = 1,
            Props = propsDocument.RootElement.Clone(),
        };

        var targets = SitePublishGateValidator.GetSectionCtaTargets(section).ToList();

        Assert.Equal(["activity:summer-social"], targets);
    }

    private static SiteSectionsDocument ValidDraftWithSection(
        string sectionId,
        string sectionType,
        string sectionPropsJson)
    {
        using var heroProps = JsonDocument.Parse("""{"headline":"Community activities"}""");
        using var sectionProps = JsonDocument.Parse(sectionPropsJson);

        return new SiteSectionsDocument
        {
            SchemaVersion = 1,
            SiteName = "Cohestra",
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = true,
                    Order = 0,
                    Props = heroProps.RootElement.Clone(),
                },
                new SiteSection
                {
                    Id = sectionId,
                    Type = sectionType,
                    Enabled = true,
                    Order = 1,
                    Props = sectionProps.RootElement.Clone(),
                },
            ],
        };
    }

    private static string? ValidateSync(SiteSectionsDocument draft)
    {
        using var dbContext = CreateDbContext();
        var validator = new SitePublishGateValidator(dbContext);
        return validator.ValidateForPublishAsync(draft).GetAwaiter().GetResult();
    }

    private static SiteSectionsDocument ValidDraft() =>
        new()
        {
            SchemaVersion = 1,
            SiteName = "Cohestra",
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = true,
                    Order = 0,
                    Props = JsonDocument.Parse("""{"headline":"Community activities"}""").RootElement,
                },
            ],
        };

    private static SiteSectionsDocument ValidDraftWithActivityCta(string slug)
    {
        using var propsDocument = JsonDocument.Parse(
            $$"""
            {
              "headline": "Community activities",
              "primaryCta": { "label": "View", "target": "activity:{{slug}}" }
            }
            """);

        return new SiteSectionsDocument
        {
            SchemaVersion = 1,
            SiteName = "Cohestra",
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = true,
                    Order = 0,
                    Props = propsDocument.RootElement.Clone(),
                },
            ],
        };
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
