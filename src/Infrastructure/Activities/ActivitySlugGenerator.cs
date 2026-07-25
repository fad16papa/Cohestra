using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Activities;

internal static partial class ActivitySlugGenerator
{
    public const int MaxSlugLength = 220;

    public static string Slugify(string name)
    {
        var normalized = name.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.IsAsciiLetterOrDigit(character) ? character : '-');
        }

        var slug = CollapseHyphensRegex().Replace(builder.ToString(), "-").Trim('-');
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "activity";
        }

        return slug.Length <= MaxSlugLength ? slug : slug[..MaxSlugLength].TrimEnd('-');
    }

    public static bool IsValidSlug(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug) || slug.Length > MaxSlugLength)
        {
            return false;
        }

        return ValidSlugRegex().IsMatch(slug);
    }

    public static async Task<string> EnsureUniqueSlugAsync(
        CohestraDbContext dbContext,
        string baseSlug,
        Guid? excludeActivityId,
        CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var suffix = 2;

        while (await dbContext.Activities.AnyAsync(
                   activity => activity.Slug == slug && activity.Id != excludeActivityId,
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    /// <summary>
    /// Ensures the activity has a valid, tenant-unique slug before going live.
    /// Regenerates from the activity name when the current slug is missing or invalid.
    /// </summary>
    public static async Task EnsureSlugForPublishAsync(
        CohestraDbContext dbContext,
        Activity activity,
        CancellationToken cancellationToken)
    {
        var current = activity.Slug?.Trim() ?? string.Empty;

        if (IsValidSlug(current))
        {
            var conflict = await dbContext.Activities.AnyAsync(
                item => item.Slug == current && item.Id != activity.Id,
                cancellationToken);
            if (conflict)
            {
                throw new InvalidOperationException(
                    $"Registration slug '{current}' is already in use. Rename the activity or choose another slug before publishing.");
            }

            if (!string.Equals(activity.Slug, current, StringComparison.Ordinal))
            {
                activity.Slug = current;
            }

            return;
        }

        var baseSlug = Slugify(activity.Name);
        activity.Slug = await EnsureUniqueSlugAsync(
            dbContext,
            baseSlug,
            activity.Id,
            cancellationToken);
        activity.UpdatedAt = DateTimeOffset.UtcNow;

        if (!IsValidSlug(activity.Slug))
        {
            throw new InvalidOperationException(
                "A valid registration slug is required before publishing.");
        }
    }

    [GeneratedRegex("-{2,}")]
    private static partial Regex CollapseHyphensRegex();

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex ValidSlugRegex();
}
