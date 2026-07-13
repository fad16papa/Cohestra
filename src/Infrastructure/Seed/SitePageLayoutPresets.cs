using System.Text.Json;
using Cohestra.Domain.Site;
using Cohestra.Infrastructure.Site;

namespace Cohestra.Infrastructure.Seed;

/// <summary>Built-in homepage layouts that showcase Epic 10 marketing sections.</summary>
public static class SitePageLayoutPresets
{
    public const string ShowcasePresetId = "showcase";
    public const string EventHubPresetId = "event-hub";

    public static bool IsBuiltInPresetId(string presetId) =>
        string.Equals(presetId, SitePageSeedDocumentBuilder.CommunityPresetId, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(presetId, SitePageSeedDocumentBuilder.MinimalPresetId, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(presetId, ShowcasePresetId, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(presetId, EventHubPresetId, StringComparison.OrdinalIgnoreCase);

    public static SiteSectionsDocument Build(SiteLandingSeedSettings settings, string presetId)
    {
        ArgumentNullException.ThrowIfNull(settings);

        return presetId.Trim().ToLowerInvariant() switch
        {
            SitePageSeedDocumentBuilder.MinimalPresetId =>
                SitePageSeedDocumentBuilder.BuildMinimal(settings),
            ShowcasePresetId => BuildShowcase(settings),
            EventHubPresetId => BuildEventHub(settings),
            SitePageSeedDocumentBuilder.CommunityPresetId =>
                SitePageSeedDocumentBuilder.BuildCommunity(settings),
            _ => SitePageSeedDocumentBuilder.BuildCommunity(settings),
        };
    }

    public static SiteSectionsDocument BuildShowcase(SiteLandingSeedSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);

        return new SiteSectionsDocument
        {
            SchemaVersion = 1,
            SiteName = settings.SiteName,
            AccentColor = settings.AccentColor ?? "#c45c26",
            PresetId = ShowcasePresetId,
            Sections =
            [
                HeroSection(settings, "hero-1", 0),
                CreateSection("carousel-1", "carousel", 1, true, new
                {
                    title = "Featured this season",
                    autoplay = false,
                    variant = "default",
                    slides = new[]
                    {
                        new
                        {
                            headline = "Summer social series",
                            description = "Three flagship gatherings — workshops, sports, and open socials.",
                            imageAssetId = "",
                            cta = new { label = "See events", target = "scroll-upcoming" },
                        },
                        new
                        {
                            headline = "Community game nights",
                            description = "Board games, trivia, and new friends every month.",
                            imageAssetId = "",
                            cta = new { label = "Browse calendar", target = "scroll-upcoming" },
                        },
                    },
                }),
                CreateSection("testimonials-1", "testimonials", 2, true, new
                {
                    title = "What members say",
                    variant = "muted",
                    items = new[]
                    {
                        new
                        {
                            quote = "Best way to discover events in our neighbourhood — I always find something new.",
                            name = "Alex Tan",
                            role = "Member since 2024",
                            avatarAssetId = "",
                        },
                        new
                        {
                            quote = "Registration takes seconds. No account needed — perfect for busy weekends.",
                            name = "Priya Sharma",
                            role = "Regular attendee",
                            avatarAssetId = "",
                        },
                    },
                }),
                CreateSection("stats-1", "stats", 3, true, new
                {
                    variant = "accent",
                    items = new[]
                    {
                        new { value = "24+", label = "Events hosted" },
                        new { value = "400+", label = "Registrations" },
                        new { value = "8", label = "Communities" },
                    },
                }),
                CreateSection("faq-1", "faq", 4, true, new
                {
                    title = "Common questions",
                    variant = "default",
                    items = new[]
                    {
                        new
                        {
                            question = "Do I need an account to register?",
                            answer = "No — open an event link or scan a QR code and sign up in seconds.",
                        },
                        new
                        {
                            question = "How do I hear about new events?",
                            answer = "Check upcoming activities below or follow your community organiser channels.",
                        },
                    },
                }),
                UpcomingSection(settings, "upcoming-1", 5),
                CreateSection("cta-band-1", "ctaBand", 6, true, new
                {
                    headline = "Ready to join the next event?",
                    description = "Browse upcoming activities and register in seconds — no login required.",
                    variant = "accent",
                    primaryCta = new { label = "See upcoming events", target = "scroll-upcoming" },
                }),
                FooterSection(settings, "footer-1", 7),
            ],
        };
    }

    public static SiteSectionsDocument BuildEventHub(SiteLandingSeedSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);

        return new SiteSectionsDocument
        {
            SchemaVersion = 1,
            SiteName = settings.SiteName,
            AccentColor = settings.AccentColor ?? "#c45c26",
            PresetId = EventHubPresetId,
            Sections =
            [
                HeroSection(settings, "hero-1", 0),
                CreateSection("carousel-1", "carousel", 1, true, new
                {
                    title = "This month's highlights",
                    autoplay = true,
                    variant = "default",
                    slides = new[]
                    {
                        new
                        {
                            headline = "Pickleball social",
                            description = "All levels welcome — paddles provided.",
                            imageAssetId = "",
                            cta = new { label = "Register", target = "scroll-upcoming" },
                        },
                        new
                        {
                            headline = "Board game night",
                            description = "Co-op and party games — bring a friend.",
                            imageAssetId = "",
                            cta = new { label = "Save a spot", target = "scroll-upcoming" },
                        },
                    },
                }),
                UpcomingSection(settings, "upcoming-1", 2),
                CreateSection("highlights-1", "highlights", 3, true, new
                {
                    variant = "default",
                    items = new[]
                    {
                        new
                        {
                            title = "Scan & register",
                            description = "QR codes on posters link straight to mobile-friendly forms.",
                            icon = "qr-code",
                        },
                        new
                        {
                            title = "Stay informed",
                            description = "Organisers follow up with consent — you choose how to hear from us.",
                            icon = "users",
                        },
                    },
                }),
                CreateSection("faq-1", "faq", 4, true, new
                {
                    title = "Before you arrive",
                    variant = "muted",
                    items = new[]
                    {
                        new
                        {
                            question = "Where do I find venue details?",
                            answer = "Each activity listing includes location and schedule once published.",
                        },
                    },
                }),
                CreateSection("cta-band-1", "ctaBand", 5, true, new
                {
                    headline = "Don't miss the next session",
                    description = "Spots fill quickly — register now to secure your place.",
                    variant = "accent",
                    primaryCta = new { label = "View calendar", target = "scroll-upcoming" },
                }),
                FooterSection(settings, "footer-1", 6),
            ],
        };
    }

    private static SiteSection HeroSection(SiteLandingSeedSettings settings, string id, int order) =>
        CreateSection(id, "hero", order, true, new
        {
            eyebrow = settings.Eyebrow,
            headline = settings.Tagline,
            description = settings.Description,
            primaryCta = new { label = "Browse events", target = "scroll-upcoming" },
        });

    private static SiteSection UpcomingSection(SiteLandingSeedSettings settings, string id, int order) =>
        CreateSection(id, "upcomingActivities", order, true, new
        {
            variant = "default",
            title = "Upcoming activities",
            limit = 6,
            emptyMessage = "New events coming soon.",
        });

    private static SiteSection FooterSection(SiteLandingSeedSettings settings, string id, int order) =>
        CreateSection(id, "footer", order, true, new
        {
            variant = "default",
            poweredByLabel = settings.PoweredByLabel,
        });

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
