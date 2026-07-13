using System.Text.Json;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Site;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Site;

public sealed class SitePublishGateValidator(CohestraDbContext dbContext)
{
    public async Task<string?> ValidateForPublishAsync(
        SiteSectionsDocument? draft,
        CancellationToken cancellationToken = default)
    {
        if (draft is null)
        {
            return "Site draft is required.";
        }

        if (draft.SchemaVersion != 1)
        {
            return "Unsupported schema version. Only schema version 1 is supported.";
        }

        var errors = new List<string>();
        var enabledSections = draft.Sections.Where(section => section.Enabled).ToList();
        if (enabledSections.Count == 0)
        {
            return "At least one section must be enabled to publish.";
        }

        var heroSection = enabledSections.FirstOrDefault(section =>
            string.Equals(section.Type, "hero", StringComparison.OrdinalIgnoreCase));

        if (heroSection is null ||
            string.IsNullOrWhiteSpace(TryGetHeroHeadline(heroSection.Props)))
        {
            errors.Add("Hero headline is required to publish.");
        }

        foreach (var section in enabledSections)
        {
            var sectionError = ValidateSectionContent(section);
            if (sectionError is not null)
            {
                errors.Add(sectionError);
            }

            foreach (var target in GetSectionCtaTargets(section))
            {
                var ctaError = await ValidateActivityTargetAsync(
                    target,
                    section.Type,
                    cancellationToken);

                if (ctaError is not null)
                {
                    errors.Add(ctaError);
                }
            }
        }

        return errors.Count == 0 ? null : string.Join(" ", errors);
    }

    private static string? ValidateSectionContent(SiteSection section)
    {
        var type = section.Type.ToLowerInvariant();
        var props = section.Props;

        return type switch
        {
            "carousel" => ValidateCarousel(props, section.Type),
            "testimonials" => ValidateTestimonials(props, section.Type),
            "faq" => ValidateFaq(props, section.Type),
            "stats" => ValidateStats(props, section.Type),
            "ctaband" => ValidateCtaBand(props, section.Type),
            _ => null,
        };
    }

    private static string? ValidateCarousel(JsonElement props, string label)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("slides", out var slidesElement) ||
            slidesElement.ValueKind != JsonValueKind.Array)
        {
            return $"{label}: add at least one slide with an image or headline.";
        }

        var hasContent = slidesElement.EnumerateArray().Any(SlideHasContent);
        return hasContent
            ? null
            : $"{label}: add at least one slide with an image or headline.";
    }

    private static string? ValidateTestimonials(JsonElement props, string label)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("items", out var itemsElement) ||
            itemsElement.ValueKind != JsonValueKind.Array ||
            !itemsElement.EnumerateArray().Any(TestimonialHasContent))
        {
            return $"{label}: add at least one testimonial quote.";
        }

        return null;
    }

    private static string? ValidateFaq(JsonElement props, string label)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("items", out var itemsElement) ||
            itemsElement.ValueKind != JsonValueKind.Array ||
            !itemsElement.EnumerateArray().Any(FaqHasContent))
        {
            return $"{label}: add at least one FAQ question.";
        }

        return null;
    }

    private static string? ValidateStats(JsonElement props, string label)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("items", out var itemsElement) ||
            itemsElement.ValueKind != JsonValueKind.Array ||
            !itemsElement.EnumerateArray().Any(StatHasContent))
        {
            return $"{label}: add at least one stat value.";
        }

        return null;
    }

    private static string? ValidateCtaBand(JsonElement props, string label)
    {
        if (props.ValueKind != JsonValueKind.Object)
        {
            return $"{label}: headline is required.";
        }

        if (!props.TryGetProperty("headline", out var headlineElement) ||
            headlineElement.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(headlineElement.GetString()))
        {
            return $"{label}: headline is required.";
        }

        return null;
    }

    private async Task<string?> ValidateActivityTargetAsync(
        string target,
        string sectionType,
        CancellationToken cancellationToken)
    {
        if (!target.StartsWith("activity:", StringComparison.Ordinal))
        {
            return null;
        }

        var slug = target["activity:".Length..].Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(slug))
        {
            return $"{sectionType}: activity slug is required.";
        }

        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Slug == slug,
            cancellationToken);

        if (activity is null || activity.Status != ActivityStatus.Published)
        {
            return $"{sectionType}: references unpublished or missing activity \"{slug}\".";
        }

        return null;
    }

    internal static IEnumerable<string> GetSectionCtaTargets(SiteSection section)
    {
        var type = section.Type.ToLowerInvariant();
        var props = section.Props;

        if (type is "hero" or "ctaband")
        {
            foreach (var target in GetCtaTargets(props))
            {
                yield return target;
            }

            yield break;
        }

        if (type != "carousel" ||
            props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("slides", out var slidesElement) ||
            slidesElement.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var slide in slidesElement.EnumerateArray())
        {
            var target = TryGetNestedCtaTarget(slide);
            if (!string.IsNullOrWhiteSpace(target))
            {
                yield return target;
            }
        }
    }

    internal static string? TryGetHeroHeadline(JsonElement props)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("headline", out var headlineElement))
        {
            return null;
        }

        return headlineElement.ValueKind == JsonValueKind.String
            ? headlineElement.GetString()
            : null;
    }

    internal static IEnumerable<string> GetCtaTargets(JsonElement props)
    {
        if (props.ValueKind != JsonValueKind.Object)
        {
            yield break;
        }

        foreach (var propertyName in new[] { "primaryCta", "secondaryCta" })
        {
            if (!props.TryGetProperty(propertyName, out var ctaElement) ||
                ctaElement.ValueKind != JsonValueKind.Object ||
                !ctaElement.TryGetProperty("target", out var targetElement) ||
                targetElement.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var target = targetElement.GetString();
            if (!string.IsNullOrWhiteSpace(target))
            {
                yield return target;
            }
        }
    }

    private static string? TryGetNestedCtaTarget(JsonElement slide)
    {
        if (slide.ValueKind != JsonValueKind.Object ||
            !slide.TryGetProperty("cta", out var ctaElement) ||
            ctaElement.ValueKind != JsonValueKind.Object ||
            !ctaElement.TryGetProperty("target", out var targetElement) ||
            targetElement.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return targetElement.GetString();
    }

    private static bool SlideHasContent(JsonElement slide)
    {
        if (slide.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        var imageAssetId = slide.TryGetProperty("imageAssetId", out var imageElement) &&
                           imageElement.ValueKind == JsonValueKind.String
            ? imageElement.GetString()?.Trim()
            : null;

        var headline = slide.TryGetProperty("headline", out var headlineElement) &&
                       headlineElement.ValueKind == JsonValueKind.String
            ? headlineElement.GetString()?.Trim()
            : null;

        return !string.IsNullOrWhiteSpace(imageAssetId) || !string.IsNullOrWhiteSpace(headline);
    }

    private static bool TestimonialHasContent(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !item.TryGetProperty("quote", out var quoteElement) ||
            quoteElement.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(quoteElement.GetString());
    }

    private static bool FaqHasContent(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !item.TryGetProperty("question", out var questionElement) ||
            questionElement.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(questionElement.GetString());
    }

    private static bool StatHasContent(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object ||
            !item.TryGetProperty("value", out var valueElement) ||
            valueElement.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(valueElement.GetString());
    }
}
