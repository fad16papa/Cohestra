using Cohestra.Contracts.Site;

namespace Cohestra.Application.Site;

public interface ISitePageService
{
    Task<SitePageAdminResponse> GetAdminAsync(CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> UpdateDraftAsync(
        UpdateSiteDraftRequest request,
        CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> PublishAsync(
        Guid publishedByUserId,
        CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> ApplyPresetAsync(
        string presetId,
        CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> ApplySavedTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default);

    Task<SiteHomepageTemplateSummaryDto> CreateSavedTemplateAsync(
        string name,
        CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> DeleteSavedTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default);

    Task<SitePageAdminResponse> RevertPublishedAsync(
        Guid revertedByUserId,
        CancellationToken cancellationToken = default);

    Task<PublicSiteResponse?> GetPublicAsync(CancellationToken cancellationToken = default);

    Task<PublicSiteResponse?> GetPreviewAsync(
        string previewToken,
        CancellationToken cancellationToken = default);

    Task<SitePreviewTokenResponse> CreatePreviewTokenAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
