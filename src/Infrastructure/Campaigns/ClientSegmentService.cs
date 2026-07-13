using Cohestra.Application.Campaigns;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Campaigns;

public sealed class ClientSegmentService(CohestraDbContext dbContext) : IClientSegmentService
{
    public async Task<ClientSegmentPreviewResponse> PreviewAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken = default)
    {
        ClientSegmentQueryValidator.Validate(query);

        var communityIds = await ResolveCommunityClientIdsAsync(query, cancellationToken);
        var additionalIds = await ResolveAdditionalClientIdsAsync(query, cancellationToken);
        var allIds = communityIds.Union(additionalIds).Distinct().ToList();

        if (allIds.Count == 0)
        {
            return new ClientSegmentPreviewResponse(
                0,
                0,
                0,
                0,
                0,
                0,
                Array.Empty<ClientSegmentPreviewItemResponse>());
        }

        var communityIdSet = communityIds.ToHashSet();
        var additionalOnlyIds = additionalIds.Except(communityIds).ToHashSet();

        var clients = await dbContext.Clients
            .AsNoTracking()
            .Where(client => allIds.Contains(client.Id))
            .OrderBy(client => client.FullName)
            .ToListAsync(cancellationToken);

        var previewItems = clients
            .Select(client => new ClientSegmentPreviewItemResponse(
                client.Id,
                client.FullName,
                client.Email,
                client.ConsentGiven,
                additionalOnlyIds.Contains(client.Id)))
            .ToList();

        var withEmailCount = clients.Count(client =>
            client.ConsentGiven &&
            !string.IsNullOrWhiteSpace(client.Email));

        var communityWithEmailCount = clients.Count(client =>
            communityIdSet.Contains(client.Id) &&
            client.ConsentGiven &&
            !string.IsNullOrWhiteSpace(client.Email));

        var additionalWithEmailCount = clients.Count(client =>
            additionalOnlyIds.Contains(client.Id) &&
            client.ConsentGiven &&
            !string.IsNullOrWhiteSpace(client.Email));

        var withoutConsentCount = clients.Count(client => !client.ConsentGiven);

        return new ClientSegmentPreviewResponse(
            clients.Count,
            withEmailCount,
            clients.Count - withEmailCount,
            withoutConsentCount,
            communityWithEmailCount,
            additionalWithEmailCount,
            previewItems);
    }

    public async Task<IReadOnlyList<Guid>> ResolveClientIdsAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken = default)
    {
        ClientSegmentQueryValidator.Validate(query);

        var communityIds = await ResolveCommunityClientIdsAsync(query, cancellationToken);
        var additionalIds = await ResolveAdditionalClientIdsAsync(query, cancellationToken);
        return communityIds.Union(additionalIds).Distinct().ToList();
    }

    private async Task<List<Guid>> ResolveCommunityClientIdsAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken)
    {
        return await BuildSegmentQuery(query)
            .Select(client => client.Id)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<Guid>> ResolveAdditionalClientIdsAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken)
    {
        if (query.AdditionalClientIds is not { Count: > 0 })
        {
            return [];
        }

        var additionalIds = query.AdditionalClientIds.Distinct().ToList();
        return await dbContext.Clients
            .AsNoTracking()
            .Where(client =>
                additionalIds.Contains(client.Id) &&
                client.ConsentGiven)
            .Select(client => client.Id)
            .ToListAsync(cancellationToken);
    }

    private IQueryable<Client> BuildSegmentQuery(ClientSegmentQueryRequest query)
    {
        var clientsQuery = dbContext.Clients.AsNoTracking();

        if (query.AllClients)
        {
            return clientsQuery;
        }

        if (query.ClientIds is { Count: > 0 })
        {
            var clientIds = query.ClientIds.Distinct().ToList();
            clientsQuery = clientsQuery.Where(client => clientIds.Contains(client.Id));
        }

        if (query.ActivityIds is { Count: > 0 })
        {
            var activityIds = query.ActivityIds.Distinct().ToList();
            clientsQuery = clientsQuery.Where(client =>
                client.Registrations.Any(registration => activityIds.Contains(registration.ActivityId)));
        }

        if (!string.IsNullOrWhiteSpace(query.LeadStatus))
        {
            if (!Enum.TryParse<LeadStatus>(query.LeadStatus.Trim(), ignoreCase: true, out var parsedStatus))
            {
                throw new ArgumentException("Lead status must be new, contacted, active, or inactive.");
            }

            clientsQuery = clientsQuery.Where(client => client.LeadStatus == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(query.Community))
        {
            var community = query.Community.Trim();
            clientsQuery = clientsQuery.Where(client =>
                client.Registrations.Any(registration =>
                    registration.Activity.CommunityLabel == community));
        }

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var normalizedName = query.Name.Trim().ToLowerInvariant();
            clientsQuery = clientsQuery.Where(client =>
                client.FullName.ToLower().Contains(normalizedName) ||
                (client.Email != null &&
                 client.Email.ToLower().Contains(normalizedName)));
        }

        if (!string.IsNullOrWhiteSpace(query.Nationality))
        {
            var normalizedNationality = query.Nationality.Trim().ToLowerInvariant();
            clientsQuery = clientsQuery.Where(client =>
                client.Nationality != null &&
                client.Nationality.ToLower().Contains(normalizedNationality));
        }

        if (!string.IsNullOrWhiteSpace(query.Profession))
        {
            var normalizedProfession = query.Profession.Trim().ToLowerInvariant();
            clientsQuery = clientsQuery.Where(client =>
                client.Profession != null &&
                client.Profession.ToLower().Contains(normalizedProfession));
        }

        if (query.ConsentOnly)
        {
            clientsQuery = clientsQuery.Where(client => client.ConsentGiven);
        }

        return clientsQuery;
    }
}
