using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static partial class ActivitySlugGenerator
{
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
        return string.IsNullOrWhiteSpace(slug) ? "activity" : slug;
    }

    public static async Task<string> EnsureUniqueSlugAsync(
        LeadGenerationCrmDbContext dbContext,
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

    [GeneratedRegex("-{2,}")]
    private static partial Regex CollapseHyphensRegex();
}
