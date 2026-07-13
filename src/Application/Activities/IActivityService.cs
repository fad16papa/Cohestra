using Cohestra.Contracts.Activities;

namespace Cohestra.Application.Activities;

public interface IActivityService
{
    Task<ActivityResponse> CreateAsync(
        CreateActivityRequest request,
        CancellationToken cancellationToken = default);

    Task<ActivityResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ActivityListResponse> ListAsync(
        string? status,
        string? category,
        string? community,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UpdateAsync(
        Guid id,
        UpdateActivityRequest request,
        CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UpdateShowOnHomepageAsync(
        Guid id,
        bool showOnHomepage,
        CancellationToken cancellationToken = default);

    Task<ActivityResponse?> ArchiveAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UnpublishAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ActivityResponse?> PublishAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PublicActivityResponse?> GetPublicBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default);

    Task<ActivityResponse?> UpdateFormSchemaAsync(
        Guid id,
        ActivityFormSchemaDto formSchema,
        CancellationToken cancellationToken = default);

    Task<ActivityRegistrationLinkResponse?> GetRegistrationLinkAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<byte[]?> GetQrCodePngAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ActivityRegistrationListResponse?> ListRegistrationsAsync(
        Guid activityId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
