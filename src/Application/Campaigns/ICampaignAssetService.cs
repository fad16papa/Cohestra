using Cohestra.Contracts.Campaigns;

namespace Cohestra.Application.Campaigns;

public interface ICampaignAssetService
{
    Task<CampaignAssetResponse> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        string? altText,
        CancellationToken cancellationToken = default);

    Task<CampaignAssetResponse> CreateFromActivityQrAsync(
        Guid activityId,
        string? altText,
        CancellationToken cancellationToken = default);

    Task<CampaignAssetFileResult?> GetFileAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    string BuildPublicUrl(Guid assetId);
}

public sealed record CampaignAssetFileResult(
    byte[] Content,
    string ContentType,
    string FileName);
