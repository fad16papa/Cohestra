using LeadGenerationCrm.Application.Clients;
using LeadGenerationCrm.Contracts.Clients;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Infrastructure.Persistence;
using LeadGenerationCrm.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Clients;

public sealed class ClientService(LeadGenerationCrmDbContext dbContext) : IClientService
{
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;

    public async Task<ClientListResponse> ListAsync(
        int page,
        int pageSize,
        string? sortBy,
        string? sortDirection,
        bool? mergeSuspect,
        int? createdWithinDays,
        int? registeredWithinDays,
        string? leadStatus,
        string? nationality,
        string? search,
        string? community,
        bool? consentOnly = null,
        string? excludeCommunity = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);

        var descending = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        var sortField = ParseSortBy(sortBy);

        var clientsQuery = dbContext.Clients.AsNoTracking();

        if (mergeSuspect == true)
        {
            clientsQuery = clientsQuery.Where(client => client.IsMergeSuspect);
        }

        if (createdWithinDays is > 0)
        {
            var periodStart = DateTimeOffset.UtcNow.AddDays(-createdWithinDays.Value);
            clientsQuery = clientsQuery.Where(client => client.CreatedAt >= periodStart);
        }

        if (registeredWithinDays is > 0)
        {
            var periodStart = DateTimeOffset.UtcNow.AddDays(-registeredWithinDays.Value);
            clientsQuery = clientsQuery.Where(client =>
                client.Registrations.Any(registration => registration.CreatedAt >= periodStart));
        }

        if (!string.IsNullOrWhiteSpace(leadStatus))
        {
            if (!TryParseLeadStatus(leadStatus, out var parsedStatus))
            {
                throw new ArgumentException("Lead status must be new, contacted, active, or inactive.");
            }

            clientsQuery = clientsQuery.Where(client => client.LeadStatus == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(nationality))
        {
            var normalizedNationality = nationality.Trim();
            clientsQuery = clientsQuery.Where(client => client.Nationality == normalizedNationality);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLowerInvariant();
            clientsQuery = clientsQuery.Where(client =>
                client.FullName.ToLower().Contains(normalizedSearch) ||
                (client.Email != null &&
                 client.Email.ToLower().Contains(normalizedSearch)) ||
                (client.Nationality != null &&
                 client.Nationality.ToLower().Contains(normalizedSearch)));
        }

        if (!string.IsNullOrWhiteSpace(community))
        {
            var communityLabel = community.Trim();
            clientsQuery = clientsQuery.Where(client =>
                client.Registrations.Any(registration =>
                    registration.Activity.CommunityLabel == communityLabel));
        }

        if (consentOnly == true)
        {
            clientsQuery = clientsQuery.Where(client => client.ConsentGiven);
        }

        if (excludeCommunity is { Length: > 0 })
        {
            var excludedCommunity = excludeCommunity.Trim();
            clientsQuery = clientsQuery.Where(client =>
                !client.Registrations.Any(registration =>
                    registration.Activity.CommunityLabel == excludedCommunity));
        }

        var query = clientsQuery
            .Select(client => new ClientListProjection
            {
                Id = client.Id,
                FullName = client.FullName,
                Email = client.Email,
                ConsentGiven = client.ConsentGiven,
                Nationality = client.Nationality,
                LeadStatus = client.LeadStatus,
                LastRegistrationAt = client.Registrations
                    .OrderByDescending(registration => registration.CreatedAt)
                    .Select(registration => (DateTimeOffset?)registration.CreatedAt)
                    .FirstOrDefault(),
                LastActivityName = client.Registrations
                    .OrderByDescending(registration => registration.CreatedAt)
                    .Select(registration => registration.Activity.Name)
                    .FirstOrDefault(),
            });

        query = ApplySort(query, sortField, descending);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        return new ClientListResponse(
            items
                .Select(item => new ClientListItemResponse(
                    item.Id,
                    item.FullName,
                    item.Email,
                    item.ConsentGiven,
                    item.Nationality,
                    item.LeadStatus.ToString().ToLowerInvariant(),
                    item.LastRegistrationAt,
                    item.LastActivityName))
                .ToList(),
            normalizedPage,
            normalizedPageSize,
            totalCount);
    }

    public async Task<IReadOnlyList<string>> ListNationalitiesAsync(
        CancellationToken cancellationToken = default) =>
        await dbContext.Clients
            .AsNoTracking()
            .Where(client => client.Nationality != null && client.Nationality != string.Empty)
            .Select(client => client.Nationality!)
            .Distinct()
            .OrderBy(value => value)
            .ToListAsync(cancellationToken);

    public async Task<ClientDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var client = await dbContext.Clients
            .AsNoTracking()
            .Include(item => item.Registrations)
            .ThenInclude(registration => registration.Activity)
            .Include(item => item.TimelineEvents)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return client is null
            ? null
            : ClientDetailMapper.ToResponse(
                client,
                client.Registrations.ToList(),
                client.TimelineEvents.ToList());
    }

    public async Task<ClientDetailResponse?> UpdateLeadStatusAsync(
        Guid id,
        string leadStatus,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseLeadStatus(leadStatus, out var parsedStatus))
        {
            throw new ArgumentException("Lead status must be new, contacted, active, or inactive.");
        }

        var client = await dbContext.Clients
            .Include(item => item.Registrations)
            .ThenInclude(registration => registration.Activity)
            .Include(item => item.TimelineEvents)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (client is null)
        {
            return null;
        }

        if (client.LeadStatus != parsedStatus)
        {
            var occurredAt = DateTimeOffset.UtcNow;
            var previousStatus = client.LeadStatus;

            client.LeadStatus = parsedStatus;
            client.UpdatedAt = occurredAt;

            dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                ClientId = client.Id,
                EventType = ClientTimelineEventType.LeadStatusChanged,
                OccurredAt = occurredAt,
                PreviousLeadStatus = previousStatus.ToString().ToLowerInvariant(),
                NewLeadStatus = parsedStatus.ToString().ToLowerInvariant(),
            });

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ClientDetailMapper.ToResponse(
            client,
            client.Registrations.ToList(),
            client.TimelineEvents.ToList());
    }

    public async Task<ClientDetailResponse?> UpdateMasterProfileAsync(
        Guid id,
        UpdateClientMasterProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Name is required.");
        }

        var client = await dbContext.Clients
            .Include(item => item.Registrations)
            .ThenInclude(registration => registration.Activity)
            .Include(item => item.TimelineEvents)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (client is null)
        {
            return null;
        }

        var fullName = request.FullName.Trim();
        if (fullName.Length > 200)
        {
            throw new ArgumentException("Name must be 200 characters or fewer.");
        }

        string? phone = null;
        string? normalizedPhone = null;
        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            phone = PhoneCountrySupport.NormalizePhone(
                request.Phone.Trim(),
                request.PhoneCountry);

            if (phone is null)
            {
                throw new ArgumentException("Enter a valid mobile number.");
            }

            normalizedPhone = phone;

            if (await dbContext.Clients.AnyAsync(
                    item => item.NormalizedPhone == normalizedPhone && item.Id != id,
                    cancellationToken))
            {
                throw new ArgumentException("Another client already uses this phone number.");
            }
        }

        string? email = null;
        string? normalizedEmail = null;
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            email = request.Email.Trim();
            if (email.Length > 320)
            {
                throw new ArgumentException("Email must be 320 characters or fewer.");
            }

            normalizedEmail = ClientContactNormalizer.NormalizeEmail(email);
            if (normalizedEmail is null)
            {
                throw new ArgumentException("Enter a valid email address.");
            }

            if (await dbContext.Clients.AnyAsync(
                    item => item.NormalizedEmail == normalizedEmail && item.Id != id,
                    cancellationToken))
            {
                throw new ArgumentException("Another client already uses this email address.");
            }
        }

        static string? TrimOptional(string? value, int maxLength, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();
            if (trimmed.Length > maxLength)
            {
                throw new ArgumentException($"{fieldName} must be {maxLength} characters or fewer.");
            }

            return trimmed;
        }

        client.FullName = fullName;
        client.Phone = phone;
        client.NormalizedPhone = normalizedPhone;
        client.Email = email;
        client.NormalizedEmail = normalizedEmail;
        client.Profession = TrimOptional(request.Profession, 200, "Profession");
        client.Nationality = TrimOptional(request.Nationality, 100, "Nationality");
        client.Residency = TrimOptional(request.Residency, 100, "Residency");
        client.ConsentGiven = request.ConsentGiven;
        client.ReferralSource = TrimOptional(request.ReferralSource, 100, "Referral source");
        client.Notes = TrimOptional(request.Notes, 4000, "Notes");
        client.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ClientDetailMapper.ToResponse(
            client,
            client.Registrations.ToList(),
            client.TimelineEvents.ToList());
    }

    public async Task<ClientDetailResponse?> RecordWhatsAppInitiatedAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var client = await dbContext.Clients
            .Include(item => item.Registrations)
            .ThenInclude(registration => registration.Activity)
            .Include(item => item.TimelineEvents)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (client is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(client.Phone))
        {
            throw new ArgumentException("Client has no phone number on file.");
        }

        var occurredAt = DateTimeOffset.UtcNow;
        client.UpdatedAt = occurredAt;

        dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            EventType = ClientTimelineEventType.WhatsAppInitiated,
            OccurredAt = occurredAt,
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ClientDetailMapper.ToResponse(
            client,
            client.Registrations.ToList(),
            client.TimelineEvents.ToList());
    }

    public async Task<ClientDetailResponse?> RecordWhatsAppFollowUpAsync(
        Guid id,
        string status,
        string? note,
        CancellationToken cancellationToken = default)
    {
        var normalizedStatus = NormalizeWhatsAppFollowUpStatus(status);
        var normalizedNote = NormalizeWhatsAppFollowUpNote(note);
        var formattedStatus = FormatWhatsAppFollowUpStatus(normalizedStatus);

        var client = await dbContext.Clients
            .Include(item => item.Registrations)
            .ThenInclude(registration => registration.Activity)
            .Include(item => item.TimelineEvents)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (client is null)
        {
            return null;
        }

        EnsureWhatsAppFollowUpIsNotDuplicate(client, formattedStatus, normalizedNote);

        var occurredAt = DateTimeOffset.UtcNow;
        client.UpdatedAt = occurredAt;

        dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            EventType = ClientTimelineEventType.WhatsAppFollowUpRecorded,
            OccurredAt = occurredAt,
            Subject = formattedStatus,
            Note = normalizedNote,
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ClientDetailMapper.ToResponse(
            client,
            client.Registrations.ToList(),
            client.TimelineEvents.ToList());
    }

    private static readonly TimeSpan WhatsAppFollowUpDuplicateCooldown = TimeSpan.FromMinutes(15);

    internal static void EnsureWhatsAppFollowUpIsNotDuplicate(
        Client client,
        string formattedStatus,
        string? normalizedNote)
    {
        var latestFollowUp = client.TimelineEvents
            .Where(item => item.EventType == ClientTimelineEventType.WhatsAppFollowUpRecorded)
            .OrderByDescending(item => item.OccurredAt)
            .FirstOrDefault();

        if (latestFollowUp is null)
        {
            return;
        }

        if (!string.Equals(latestFollowUp.Subject, formattedStatus, StringComparison.Ordinal))
        {
            return;
        }

        if (!string.Equals(
                NormalizeWhatsAppFollowUpNote(latestFollowUp.Note),
                normalizedNote,
                StringComparison.Ordinal))
        {
            return;
        }

        if (DateTimeOffset.UtcNow - latestFollowUp.OccurredAt > WhatsAppFollowUpDuplicateCooldown)
        {
            return;
        }

        throw new DuplicateWhatsAppFollowUpException();
    }

    private static string? NormalizeWhatsAppFollowUpNote(string? note) =>
        string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static string NormalizeWhatsAppFollowUpStatus(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Follow-up status is required.");
        }

        var normalized = status.Trim().ToLowerInvariant();
        if (normalized is not ("contacted" or "awaiting_reply"))
        {
            throw new ArgumentException("Follow-up status must be contacted or awaiting_reply.");
        }

        return normalized;
    }

    private static string FormatWhatsAppFollowUpStatus(string normalizedStatus) =>
        normalizedStatus switch
        {
            "contacted" => "Contacted",
            "awaiting_reply" => "Awaiting reply",
            _ => normalizedStatus,
        };

    private static bool TryParseLeadStatus(string leadStatus, out LeadStatus parsedStatus)
    {
        parsedStatus = LeadStatus.New;
        return Enum.TryParse(leadStatus.Trim(), ignoreCase: true, out parsedStatus);
    }

    private static ClientListSortBy ParseSortBy(string? sortBy) =>
        sortBy?.Trim().ToLowerInvariant() switch
        {
            "name" => ClientListSortBy.Name,
            "status" => ClientListSortBy.Status,
            "lastregistrationdate" or "last_registration_date" => ClientListSortBy.LastRegistrationDate,
            _ => ClientListSortBy.LastRegistrationDate,
        };

    private static IQueryable<ClientListProjection> ApplySort(
        IQueryable<ClientListProjection> query,
        ClientListSortBy sortBy,
        bool descending) =>
        (sortBy, descending) switch
        {
            (ClientListSortBy.Name, false) => query.OrderBy(item => item.FullName),
            (ClientListSortBy.Name, true) => query.OrderByDescending(item => item.FullName),
            (ClientListSortBy.Status, false) => query.OrderBy(item => item.LeadStatus),
            (ClientListSortBy.Status, true) => query.OrderByDescending(item => item.LeadStatus),
            (ClientListSortBy.LastRegistrationDate, false) => query
                .OrderBy(item => item.LastRegistrationAt == null)
                .ThenBy(item => item.LastRegistrationAt),
            (ClientListSortBy.LastRegistrationDate, true) => query
                .OrderBy(item => item.LastRegistrationAt == null)
                .ThenByDescending(item => item.LastRegistrationAt),
            _ => query.OrderByDescending(item => item.LastRegistrationAt),
        };

    private sealed class ClientListProjection
    {
        public Guid Id { get; init; }

        public string FullName { get; init; } = string.Empty;

        public string? Email { get; init; }

        public bool ConsentGiven { get; init; }

        public string? Nationality { get; init; }

        public LeadStatus LeadStatus { get; init; }

        public DateTimeOffset? LastRegistrationAt { get; init; }

        public string? LastActivityName { get; init; }
    }

    private enum ClientListSortBy
    {
        Name,
        Status,
        LastRegistrationDate,
    }
}
