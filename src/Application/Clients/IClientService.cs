using Cohestra.Contracts.Clients;

namespace Cohestra.Application.Clients;

public interface IClientService
{
    Task<ClientListResponse> ListAsync(
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
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> ListNationalitiesAsync(
        CancellationToken cancellationToken = default);

    Task<ClientDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ClientDetailResponse?> UpdateLeadStatusAsync(
        Guid id,
        string leadStatus,
        CancellationToken cancellationToken = default);

    Task<ClientDetailResponse?> UpdateMasterProfileAsync(
        Guid id,
        UpdateClientMasterProfileRequest request,
        CancellationToken cancellationToken = default);

    Task<ClientDetailResponse?> RecordWhatsAppInitiatedAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ClientDetailResponse?> RecordWhatsAppFollowUpAsync(
        Guid id,
        string status,
        string? note,
        CancellationToken cancellationToken = default);
}
