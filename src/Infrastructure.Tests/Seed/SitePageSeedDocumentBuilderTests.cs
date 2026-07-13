using System.Text.Json;
using LeadGenerationCrm.Infrastructure.Seed;

namespace LeadGenerationCrm.Infrastructure.Tests.Seed;

public sealed class SitePageSeedDocumentBuilderTests
{
    [Fact]
    public void Build_MapsSettingsToHeroAndRootFields()
    {
        var settings = new SiteLandingSeedSettings
        {
            SiteName = "Custom Collective",
            Tagline = "Custom tagline headline",
            Description = "Custom description body",
            Eyebrow = "Custom eyebrow",
            OperatorCtaLabel = "Custom operator CTA",
            PoweredByLabel = "Powered by Test",
            AccentColor = "#112233",
        };

        var document = SitePageSeedDocumentBuilder.Build(settings);

        Assert.Equal(1, document.SchemaVersion);
        Assert.Equal("Custom Collective", document.SiteName);
        Assert.Equal("#112233", document.AccentColor);
        Assert.Equal("community", document.PresetId);
        Assert.Equal(5, document.Sections.Count);

        var hero = document.Sections.Single(section => section.Type == "hero");
        Assert.Equal("Custom tagline headline", hero.Props.GetProperty("headline").GetString());
        Assert.Equal("Custom eyebrow", hero.Props.GetProperty("eyebrow").GetString());
        Assert.Equal("Custom description body", hero.Props.GetProperty("description").GetString());
        Assert.False(hero.Props.TryGetProperty("secondaryCta", out _));

        var footer = document.Sections.Single(section => section.Type == "footer");
        Assert.Equal("Powered by Test", footer.Props.GetProperty("poweredByLabel").GetString());
    }

    [Fact]
    public void Build_IncludesRequiredSectionTypesInOrder()
    {
        var document = SitePageSeedDocumentBuilder.Build(new SiteLandingSeedSettings());

        Assert.Equal(
            ["hero", "highlights", "upcomingActivities", "howItWorks", "footer"],
            document.Sections.OrderBy(section => section.Order).Select(section => section.Type).ToArray());
    }

    [Fact]
    public void Build_HowItWorksStepsUseOperatorCopyNotHighlights()
    {
        var document = SitePageSeedDocumentBuilder.Build(new SiteLandingSeedSettings());

        var highlights = document.Sections.Single(section => section.Type == "highlights");
        var howItWorks = document.Sections.Single(section => section.Type == "howItWorks");

        var highlightTitles = highlights.Props
            .GetProperty("items")
            .EnumerateArray()
            .Select(item => item.GetProperty("title").GetString())
            .ToHashSet(StringComparer.Ordinal);

        var stepTitles = howItWorks.Props
            .GetProperty("steps")
            .EnumerateArray()
            .Select(item => item.GetProperty("title").GetString())
            .ToList();

        Assert.Equal(3, stepTitles.Count);
        Assert.All(stepTitles, title => Assert.DoesNotContain(title, highlightTitles));
        Assert.Contains("Create and publish activities", stepTitles);
    }

    [Fact]
    public void BuildMinimal_DisablesHighlightsAndHowItWorks()
    {
        var document = SitePageSeedDocumentBuilder.Build(
            new SiteLandingSeedSettings(),
            SitePageSeedDocumentBuilder.MinimalPresetId);

        Assert.Equal("minimal", document.PresetId);

        var highlights = document.Sections.Single(section => section.Type == "highlights");
        var howItWorks = document.Sections.Single(section => section.Type == "howItWorks");
        var hero = document.Sections.Single(section => section.Type == "hero");

        Assert.False(highlights.Enabled);
        Assert.False(howItWorks.Enabled);
        Assert.True(hero.Enabled);
    }

    [Fact]
    public void ApplyPresetToDraft_ResetsLogoAndPreservesSiteNameAndAccent()
    {
        var currentDraft = SitePageSeedDocumentBuilder.Build(new SiteLandingSeedSettings
        {
            SiteName = "Operator Collective",
            AccentColor = "#abcdef",
        });
        currentDraft.LogoAssetId = "logo-123";

        var presetDraft = SitePageSeedDocumentBuilder.ApplyPresetToDraft(
            currentDraft,
            new SiteLandingSeedSettings(),
            SitePageSeedDocumentBuilder.MinimalPresetId);

        Assert.Equal("Operator Collective", presetDraft.SiteName);
        Assert.Equal("#abcdef", presetDraft.AccentColor);
        Assert.Null(presetDraft.LogoAssetId);
        Assert.Equal("minimal", presetDraft.PresetId);
    }

    [Fact]
    public void ApplyPresetToDraft_PreservesHeroImageAssetId()
    {
        var currentDraft = SitePageSeedDocumentBuilder.Build(new SiteLandingSeedSettings());
        var hero = currentDraft.Sections.Single(section => section.Type == "hero");
        hero.Props = JsonDocument.Parse(
            """
            {
              "headline": "Custom headline",
              "heroImageAssetId": "hero-asset-456"
            }
            """).RootElement.Clone();

        var presetDraft = SitePageSeedDocumentBuilder.ApplyPresetToDraft(
            currentDraft,
            new SiteLandingSeedSettings(),
            SitePageSeedDocumentBuilder.MinimalPresetId);

        var presetHero = presetDraft.Sections.Single(section => section.Type == "hero");
        Assert.Equal(
            "hero-asset-456",
            presetHero.Props.GetProperty("heroImageAssetId").GetString());
    }

    [Fact]
    public void BuildShowcase_IncludesMarketingSections()
    {
        var document = SitePageLayoutPresets.BuildShowcase(new SiteLandingSeedSettings());

        Assert.Equal("showcase", document.PresetId);
        Assert.Contains(document.Sections, section => section.Type == "carousel");
        Assert.Contains(document.Sections, section => section.Type == "testimonials");
        Assert.Contains(document.Sections, section => section.Type == "stats");
        Assert.Contains(document.Sections, section => section.Type == "faq");
        Assert.Contains(document.Sections, section => section.Type == "ctaBand");
    }

    [Fact]
    public void BuildEventHub_IncludesCarouselHighlightsAndCtaBand()
    {
        var document = SitePageLayoutPresets.BuildEventHub(new SiteLandingSeedSettings());

        Assert.Equal("event-hub", document.PresetId);
        Assert.Contains(document.Sections, section => section.Type == "carousel");
        Assert.Contains(document.Sections, section => section.Type == "highlights");
        Assert.Contains(document.Sections, section => section.Type == "faq");
        Assert.Contains(document.Sections, section => section.Type == "ctaBand");
    }

    [Fact]
    public void ApplySavedTemplateToDraft_ResetsLogoAndPreservesBranding()
    {
        var currentDraft = SitePageSeedDocumentBuilder.Build(new SiteLandingSeedSettings
        {
            SiteName = "Operator Collective",
            AccentColor = "#abcdef",
        });
        currentDraft.LogoAssetId = "logo-123";

        var templateSections = SitePageLayoutPresets.BuildShowcase(new SiteLandingSeedSettings()).Sections;
        var templateDraft = SitePageSeedDocumentBuilder.ApplySavedTemplateToDraft(
            currentDraft,
            templateSections,
            new SiteLandingSeedSettings());

        Assert.Equal("Operator Collective", templateDraft.SiteName);
        Assert.Equal("#abcdef", templateDraft.AccentColor);
        Assert.Null(templateDraft.LogoAssetId);
        Assert.Null(templateDraft.PresetId);
        Assert.Contains(templateDraft.Sections, section => section.Type == "testimonials");
    }
}
