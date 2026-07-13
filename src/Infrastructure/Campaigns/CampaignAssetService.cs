using LeadGenerationCrm.Application.Activities;
using LeadGenerationCrm.Application.Campaigns;
using LeadGenerationCrm.Contracts.Campaigns;
using LeadGenerationCrm.Domain.Campaigns;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LeadGenerationCrm.Infrastructure.Campaigns;

public sealed class CampaignAssetService(
    LeadGenerationCrmDbContext dbContext,
    IActivityService activityService,
    IOptions<CampaignAssetOptions> options) : ICampaignAssetService
{
    private const long MaxUploadBytes = 2 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
    };

    public async Task<CampaignAssetResponse> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        string? altText,
        CancellationToken cancellationToken = default)
    {
        var normalizedContentType = NormalizeContentType(contentType);
        if (!AllowedContentTypes.Contains(normalizedContentType))
        {
            throw new ArgumentException("Only PNG, JPG, WEBP, or GIF images are allowed.");
        }

        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);

        if (buffer.Length == 0)
        {
            throw new ArgumentException("Image file is empty.");
        }

        if (buffer.Length > MaxUploadBytes)
        {
            throw new ArgumentException("Image must be 2MB or smaller.");
        }

        return await SaveAssetAsync(
            buffer.ToArray(),
            fileName,
            normalizedContentType,
            altText,
            activityId: null,
            cancellationToken);
    }

    public async Task<CampaignAssetResponse> CreateFromActivityQrAsync(
        Guid activityId,
        string? altText,
        CancellationToken cancellationToken = default)
    {
        var png = await activityService.GetQrCodePngAsync(activityId, cancellationToken);
        if (png is null || png.Length == 0)
        {
            throw new ArgumentException(
                "QR code is only available for published activities.");
        }

        var activity = await activityService.GetByIdAsync(activityId, cancellationToken);
        var fileName = activity is null
            ? $"{activityId:N}-qr.png"
            : $"{activity.Slug}-registration-qr.png";

        return await SaveAssetAsync(
            png,
            fileName,
            "image/png",
            string.IsNullOrWhiteSpace(altText)
                ? activity is null
                    ? "Activity registration QR code"
                    : $"Scan to register for {activity.Name}"
                : altText.Trim(),
            activityId,
            cancellationToken);
    }

    public async Task<CampaignAssetFileResult?> GetFileAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var asset = await dbContext.CampaignAssets
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (asset is null)
        {
            return null;
        }

        var absolutePath = GetAbsolutePath(asset.RelativePath);
        if (!File.Exists(absolutePath))
        {
            return null;
        }

        var bytes = await File.ReadAllBytesAsync(absolutePath, cancellationToken);
        return new CampaignAssetFileResult(bytes, asset.ContentType, asset.FileName);
    }

    public string BuildPublicUrl(Guid assetId)
    {
        var baseUrl = options.Value.PublicApiBaseUrl.TrimEnd('/');
        return $"{baseUrl}/api/v1/public/campaign-assets/{assetId:D}";
    }

    private async Task<CampaignAssetResponse> SaveAssetAsync(
        byte[] bytes,
        string fileName,
        string contentType,
        string? altText,
        Guid? activityId,
        CancellationToken cancellationToken)
    {
        EnsureStorageDirectory();

        var assetId = Guid.NewGuid();
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = contentType switch
            {
                "image/png" => ".png",
                "image/jpeg" or "image/jpg" => ".jpg",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                _ => ".bin",
            };
        }

        var relativePath = $"{assetId:N}{extension.ToLowerInvariant()}";
        var absolutePath = GetAbsolutePath(relativePath);
        await File.WriteAllBytesAsync(absolutePath, bytes, cancellationToken);

        var asset = new CampaignAsset
        {
            Id = assetId,
            FileName = Path.GetFileName(fileName),
            ContentType = contentType,
            RelativePath = relativePath,
            SizeBytes = bytes.Length,
            AltText = string.IsNullOrWhiteSpace(altText) ? null : altText.Trim(),
            ActivityId = activityId,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.CampaignAssets.Add(asset);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(asset);
    }

    private CampaignAssetResponse ToResponse(CampaignAsset asset) =>
        new(
            asset.Id,
            asset.FileName,
            asset.ContentType,
            asset.SizeBytes,
            asset.AltText,
            BuildPublicUrl(asset.Id),
            asset.CreatedAt);

    private void EnsureStorageDirectory()
    {
        var path = options.Value.StoragePath;
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    private string GetAbsolutePath(string relativePath) =>
        Path.Combine(options.Value.StoragePath, relativePath);

    private static string NormalizeContentType(string contentType)
    {
        var normalized = contentType.Split(';', 2)[0].Trim().ToLowerInvariant();
        return normalized switch
        {
            "image/jpg" => "image/jpeg",
            _ => normalized,
        };
    }
}
