using LeadGenerationCrm.Application.Activities;
using LeadGenerationCrm.Contracts.Activities;
using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Activities;

public sealed class CommunityService(LeadGenerationCrmDbContext dbContext) : ICommunityService
{
    public async Task<CommunityListResponse> ListAsync(CancellationToken cancellationToken = default)
    {
        var communities = await dbContext.Communities
            .AsNoTracking()
            .OrderBy(community => community.Name)
            .ToListAsync(cancellationToken);

        var items = new List<CommunityListItemResponse>(communities.Count);

        foreach (var community in communities)
        {
            var counts = await GetCountsAsync(community.Name, cancellationToken);
            items.Add(new CommunityListItemResponse(
                community.Id,
                community.Name,
                counts.ActivityCount,
                counts.LeadCount,
                community.CreatedAt,
                community.UpdatedAt));
        }

        return new CommunityListResponse(items);
    }

    public async Task<CommunityResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var community = await dbContext.Communities
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (community is null)
        {
            return null;
        }

        var counts = await GetCountsAsync(community.Name, cancellationToken);

        return new CommunityResponse(
            community.Id,
            community.Name,
            counts.ActivityCount,
            counts.LeadCount,
            community.CreatedAt,
            community.UpdatedAt);
    }

    public async Task<CommunityResponse> CreateAsync(
        CreateCommunityRequest request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);

        if (await NameExistsAsync(name, null, cancellationToken))
        {
            throw new ArgumentException("A community with this name already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var community = new Community
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Communities.Add(community);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CommunityResponse(community.Id, community.Name, 0, 0, community.CreatedAt, community.UpdatedAt);
    }

    public async Task<CommunityResponse?> UpdateAsync(
        Guid id,
        UpdateCommunityRequest request,
        CancellationToken cancellationToken = default)
    {
        var community = await dbContext.Communities
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (community is null)
        {
            return null;
        }

        var nextName = NormalizeName(request.Name);

        if (await NameExistsAsync(nextName, community.Id, cancellationToken))
        {
            throw new ArgumentException("A community with this name already exists.");
        }

        var previousName = community.Name;

        if (!string.Equals(previousName, nextName, StringComparison.Ordinal))
        {
            var activities = await dbContext.Activities
                .Where(activity => activity.CommunityLabel == previousName)
                .ToListAsync(cancellationToken);

            foreach (var activity in activities)
            {
                activity.CommunityLabel = nextName;
                activity.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        community.Name = nextName;
        community.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        var counts = await GetCountsAsync(community.Name, cancellationToken);

        return new CommunityResponse(
            community.Id,
            community.Name,
            counts.ActivityCount,
            counts.LeadCount,
            community.CreatedAt,
            community.UpdatedAt);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var community = await dbContext.Communities
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (community is null)
        {
            return false;
        }

        var inUse = await dbContext.Activities
            .AnyAsync(activity => activity.CommunityLabel == community.Name, cancellationToken);

        if (inUse)
        {
            throw new ArgumentException(
                "This community is linked to one or more activities. Reassign those activities before deleting.");
        }

        dbContext.Communities.Remove(community);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<(int ActivityCount, int LeadCount)> GetCountsAsync(
        string communityName,
        CancellationToken cancellationToken)
    {
        var activityCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(activity => activity.CommunityLabel == communityName, cancellationToken);

        var leadCount = await dbContext.Clients
            .AsNoTracking()
            .CountAsync(
                client => client.Registrations.Any(registration =>
                    registration.Activity.CommunityLabel == communityName),
                cancellationToken);

        return (activityCount, leadCount);
    }

    private async Task<bool> NameExistsAsync(
        string name,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Communities
            .AsNoTracking()
            .AnyAsync(
                community =>
                    community.Name == name &&
                    (!excludeId.HasValue || community.Id != excludeId.Value),
                cancellationToken);
    }

    private static string NormalizeName(string value)
    {
        var name = value?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Community name is required.");
        }

        if (name.Length > 100)
        {
            throw new ArgumentException("Community name must be 100 characters or fewer.");
        }

        return name;
    }
}
