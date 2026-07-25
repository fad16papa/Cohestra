using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Signup;

internal static class TenantSlugAvailability
{
    public static async Task<IReadOnlyList<string>> BuildSuggestionsAsync(
        CohestraDbContext dbContext,
        string normalizedBase,
        int maxSuggestions,
        CancellationToken cancellationToken)
    {
        var suggestions = new List<string>(maxSuggestions);
        var candidates = BuildCandidateSlugs(normalizedBase);

        foreach (var candidate in candidates)
        {
            if (suggestions.Count >= maxSuggestions)
            {
                break;
            }

            if (TenantSlugRules.ValidateForProvision(candidate) is not null)
            {
                continue;
            }

            var taken = await dbContext.Tenants.AsNoTracking()
                .AnyAsync(t => t.Slug == candidate, cancellationToken);
            if (!taken)
            {
                suggestions.Add(candidate);
            }
        }

        return suggestions;
    }

    internal static IEnumerable<string> BuildCandidateSlugs(string normalizedBase)
    {
        yield return $"{normalizedBase}-2";
        yield return $"{normalizedBase}-hq";
        yield return $"{normalizedBase}-team";
        yield return $"{normalizedBase}-org";

        for (var i = 2; i <= 50; i++)
        {
            yield return $"{normalizedBase}-{i}";
        }
    }
}
