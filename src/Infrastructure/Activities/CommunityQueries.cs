using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Activities;

internal static class CommunityQueries
{
    public static async Task<Community?> GetByLabelAsync(
        CohestraDbContext dbContext,
        Guid tenantId,
        string communityLabel,
        CancellationToken cancellationToken = default)
    {
        var normalized = communityLabel?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return await dbContext.Communities
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.TenantId == tenantId && item.Name == normalized,
                cancellationToken);
    }
}
