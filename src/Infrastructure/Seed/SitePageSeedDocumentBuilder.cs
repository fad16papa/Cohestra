using System.Text.Json;

using LeadGenerationCrm.Contracts.Site;

using LeadGenerationCrm.Domain.Site;

using LeadGenerationCrm.Infrastructure.Site;



namespace LeadGenerationCrm.Infrastructure.Seed;



public static class SitePageSeedDocumentBuilder

{

    public const string CommunityPresetId = "community";

    public const string MinimalPresetId = "minimal";



    public static SiteSectionsDocument Build(

        SiteLandingSeedSettings settings,

        string presetId = CommunityPresetId)

    {

        ArgumentNullException.ThrowIfNull(settings);



        return SitePageLayoutPresets.Build(settings, presetId);

    }



    public static SiteSectionsDocument BuildCommunity(SiteLandingSeedSettings settings)

    {

        ArgumentNullException.ThrowIfNull(settings);



        return new SiteSectionsDocument

        {

            SchemaVersion = 1,

            SiteName = settings.SiteName,

            AccentColor = settings.AccentColor ?? "#c45c26",

            PresetId = CommunityPresetId,

            Sections =

            [

                CreateSection("hero-1", "hero", 0, true, new

                {

                    eyebrow = settings.Eyebrow,

                    headline = settings.Tagline,

                    description = settings.Description,

                    primaryCta = new { label = "Browse events", target = "scroll-upcoming" },

                }),

                CreateSection("highlights-1", "highlights", 1, true, new

                {

                    variant = "default",

                    items = new[]

                    {

                        new

                        {

                            title = "Discover activities",

                            description =

                                "Workshops, game nights, sports, and social gatherings in one place.",

                            icon = "calendar",

                        },

                        new

                        {

                            title = "Register in seconds",

                            description =

                                "Scan a QR code or open a link — no account needed to sign up for an event.",

                            icon = "qr-code",

                        },

                        new

                        {

                            title = "Stay in the loop",

                            description =

                                "Your details are kept on file so organisers can follow up with care and consent.",

                            icon = "users",

                        },

                    },

                }),

                CreateSection("upcoming-1", "upcomingActivities", 2, true, new

                {

                    variant = "default",

                    title = "Upcoming activities",

                    limit = 6,

                    emptyMessage = "New events coming soon.",

                }),

                CreateSection("how-it-works-1", "howItWorks", 3, true, new

                {

                    variant = "default",

                    title = "For community operators",

                    description =

                        "Manage activities, registrations, client follow-up, email campaigns, and reports from one workspace.",

                    steps = new[]

                    {

                        new

                        {

                            title = "Create and publish activities",

                            description =

                                "Set up events with registration forms, QR codes, and shareable links.",

                        },

                        new

                        {

                            title = "Manage registrations and clients",

                            description =

                                "Track sign-ups, follow up with consent, and keep client details in one place.",

                        },

                        new

                        {

                            title = "Run campaigns and reports",

                            description =

                                "Send email campaigns and see which activities drive the most registrations.",

                        },

                    },

                }),

                CreateSection("footer-1", "footer", 4, true, new

                {

                    variant = "default",

                    poweredByLabel = settings.PoweredByLabel,

                }),

            ],

        };

    }



    public static SiteSectionsDocument BuildMinimal(SiteLandingSeedSettings settings)

    {

        ArgumentNullException.ThrowIfNull(settings);



        return new SiteSectionsDocument

        {

            SchemaVersion = 1,

            SiteName = settings.SiteName,

            AccentColor = settings.AccentColor ?? "#c45c26",

            PresetId = MinimalPresetId,

            Sections =

            [

                CreateSection("hero-1", "hero", 0, true, new

                {

                    eyebrow = settings.Eyebrow,

                    headline = settings.Tagline,

                    description = settings.Description,

                    primaryCta = new { label = "Browse events", target = "scroll-upcoming" },

                }),

                CreateSection("highlights-1", "highlights", 1, false, new

                {

                    items = Array.Empty<object>(),

                }),

                CreateSection("upcoming-1", "upcomingActivities", 2, true, new

                {

                    variant = "default",

                    title = "Upcoming activities",

                    limit = 6,

                    emptyMessage = "New events coming soon.",

                }),

                CreateSection("how-it-works-1", "howItWorks", 3, false, new

                {

                    title = "For community operators",

                    description = string.Empty,

                    steps = Array.Empty<object>(),

                }),

                CreateSection("footer-1", "footer", 4, true, new

                {

                    variant = "default",

                    poweredByLabel = settings.PoweredByLabel,

                }),

            ],

        };

    }



    public static SiteSectionsDocument ApplyPresetToDraft(

        SiteSectionsDocument currentDraft,

        SiteLandingSeedSettings settings,

        string presetId)

    {

        ArgumentNullException.ThrowIfNull(currentDraft);

        ArgumentNullException.ThrowIfNull(settings);



        var presetSettings = new SiteLandingSeedSettings

        {

            SiteName = string.IsNullOrWhiteSpace(currentDraft.SiteName)

                ? settings.SiteName

                : currentDraft.SiteName,

            Tagline = settings.Tagline,

            Description = settings.Description,

            Eyebrow = settings.Eyebrow,

            OperatorCtaLabel = settings.OperatorCtaLabel,

            PoweredByLabel = settings.PoweredByLabel,

            AccentColor = currentDraft.AccentColor ?? settings.AccentColor,

        };



        var presetDocument = Build(presetSettings, presetId);

        return ApplyLayoutToDraft(currentDraft, presetDocument, presetDocument.PresetId);
    }

    public static SiteSectionsDocument ApplyLayoutToDraft(
        SiteSectionsDocument currentDraft,
        SiteSectionsDocument layoutDocument,
        string? presetId)
    {
        ArgumentNullException.ThrowIfNull(currentDraft);
        ArgumentNullException.ThrowIfNull(layoutDocument);

        layoutDocument.AccentColor = currentDraft.AccentColor ?? layoutDocument.AccentColor;
        layoutDocument.SiteName = string.IsNullOrWhiteSpace(currentDraft.SiteName)
            ? layoutDocument.SiteName
            : currentDraft.SiteName;
        layoutDocument.LogoAssetId = null;
        layoutDocument.PresetId = presetId;

        PreserveHeroImageAsset(currentDraft, layoutDocument);

        return layoutDocument;
    }

    public static SiteSectionsDocument ApplySavedTemplateToDraft(
        SiteSectionsDocument currentDraft,
        IReadOnlyList<SiteSection> templateSections,
        SiteLandingSeedSettings settings)
    {
        ArgumentNullException.ThrowIfNull(currentDraft);
        ArgumentNullException.ThrowIfNull(templateSections);
        ArgumentNullException.ThrowIfNull(settings);

        var layoutDocument = new SiteSectionsDocument
        {
            SchemaVersion = 1,
            SiteName = string.IsNullOrWhiteSpace(currentDraft.SiteName)
                ? settings.SiteName
                : currentDraft.SiteName,
            AccentColor = currentDraft.AccentColor ?? settings.AccentColor,
            PresetId = null,
            Sections = templateSections
                .Select(section => new SiteSection
                {
                    Id = section.Id,
                    Type = section.Type,
                    Enabled = section.Enabled,
                    Order = section.Order,
                    Props = section.Props,
                })
                .ToList(),
        };

        return ApplyLayoutToDraft(currentDraft, layoutDocument, presetId: null);

    }



    private static void PreserveHeroImageAsset(

        SiteSectionsDocument currentDraft,

        SiteSectionsDocument presetDocument)

    {

        var existingHero = currentDraft.Sections.FirstOrDefault(section =>

            string.Equals(section.Type, "hero", StringComparison.OrdinalIgnoreCase));

        if (existingHero is null ||

            existingHero.Props.ValueKind != JsonValueKind.Object ||

            !existingHero.Props.TryGetProperty("heroImageAssetId", out var assetIdElement) ||

            assetIdElement.ValueKind != JsonValueKind.String ||

            string.IsNullOrWhiteSpace(assetIdElement.GetString()))

        {

            return;

        }



        var presetHero = presetDocument.Sections.FirstOrDefault(section =>

            string.Equals(section.Type, "hero", StringComparison.OrdinalIgnoreCase));

        if (presetHero is null)

        {

            return;

        }



        presetHero.Props = MergeHeroImageAssetId(

            presetHero.Props,

            assetIdElement.GetString()!);

    }



    private static JsonElement MergeHeroImageAssetId(JsonElement props, string heroImageAssetId)

    {

        using var stream = new MemoryStream();

        using (var writer = new Utf8JsonWriter(stream))

        {

            writer.WriteStartObject();

            foreach (var property in props.EnumerateObject())

            {

                if (string.Equals(property.Name, "heroImageAssetId", StringComparison.Ordinal))

                {

                    continue;

                }



                property.WriteTo(writer);

            }



            writer.WriteString("heroImageAssetId", heroImageAssetId);

            writer.WriteEndObject();

        }



        stream.Position = 0;

        using var document = JsonDocument.Parse(stream);

        return document.RootElement.Clone();

    }



    public static SiteSectionsDocumentDto ToDto(SiteSectionsDocument document) =>

        new(

            document.SchemaVersion,

            document.SiteName,

            document.AccentColor,

            document.LogoAssetId,

            document.PresetId,

            document.Sections

                .OrderBy(section => section.Order)

                .Select(section => new SiteSectionDto(

                    section.Id,

                    section.Type,

                    section.Enabled,

                    section.Order,

                    section.Props))

                .ToList());



    private static SiteSection CreateSection(

        string id,

        string type,

        int order,

        bool enabled,

        object props) =>

        new()

        {

            Id = id,

            Type = type,

            Enabled = enabled,

            Order = order,

            Props = JsonSerializer.SerializeToElement(props, SiteSectionsDocumentJson.SerializerOptions),

        };

}


