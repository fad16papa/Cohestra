using LeadGenerationCrm.Contracts.Activities;

namespace LeadGenerationCrm.Application.Activities;

public interface ICommunityService
{
    Task<CommunityListResponse> ListAsync(CancellationToken cancellationToken = default);

    Task<CommunityResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CommunityResponse> CreateAsync(
        CreateCommunityRequest request,
        CancellationToken cancellationToken = default);

    Task<CommunityResponse?> UpdateAsync(
        Guid id,
        UpdateCommunityRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
