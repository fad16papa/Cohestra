using LeadGenerationCrm.Contracts.Campaigns;

namespace LeadGenerationCrm.Application.Campaigns;

public interface IEmailTemplateService
{
    Task<EmailTemplateListResponse> ListAsync(CancellationToken cancellationToken = default);

    Task<EmailTemplateResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<EmailTemplateResponse> CreateAsync(
        CreateEmailTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<EmailTemplateResponse?> UpdateAsync(
        Guid id,
        UpdateEmailTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IClientSegmentService
{
    Task<ClientSegmentPreviewResponse> PreviewAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> ResolveClientIdsAsync(
        ClientSegmentQueryRequest query,
        CancellationToken cancellationToken = default);
}

public interface ICampaignService
{
    Task<SendCampaignResponse> SendAsync(
        SendCampaignRequest request,
        CancellationToken cancellationToken = default);

    Task<SendTestCampaignEmailResponse> SendTestAsync(
        SendTestCampaignEmailRequest request,
        string operatorEmail,
        CancellationToken cancellationToken = default);

    Task<CampaignListResponse> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<CampaignDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
