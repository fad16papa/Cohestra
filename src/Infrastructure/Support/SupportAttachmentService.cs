using Cohestra.Domain.Support;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportAttachmentService(IOptions<SupportSettings> options)
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    };

    public async Task<SupportIssueAttachment> SaveAsync(
        Guid issueId,
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var normalizedContentType = NormalizeContentType(contentType);

        if (!AllowedContentTypes.Contains(normalizedContentType))
        {
            throw new ArgumentException("Only PNG, JPEG, or WEBP images are allowed.");
        }

        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);

        if (buffer.Length == 0)
        {
            throw new ArgumentException("Image file is empty.");
        }

        if (buffer.Length > settings.MaxFileBytes)
        {
            throw new ArgumentException("Each screenshot must be 2MB or smaller.");
        }

        EnsureIssueDirectory(issueId);

        var attachmentId = Guid.CreateVersion7();
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = normalizedContentType switch
            {
                "image/png" => ".png",
                "image/jpeg" => ".jpg",
                "image/webp" => ".webp",
                _ => ".bin",
            };
        }

        var relativePath = Path.Combine(issueId.ToString("D"), $"{attachmentId:N}{extension.ToLowerInvariant()}");
        var absolutePath = GetAbsolutePath(relativePath);
        await File.WriteAllBytesAsync(absolutePath, buffer.ToArray(), cancellationToken);

        return new SupportIssueAttachment
        {
            Id = attachmentId,
            SupportIssueId = issueId,
            FileName = Path.GetFileName(fileName),
            ContentType = normalizedContentType,
            SizeBytes = buffer.Length,
            RelativePath = relativePath.Replace('\\', '/'),
            CreatedAt = DateTimeOffset.UtcNow,
        };
    }

    public async Task<byte[]?> ReadBytesAsync(
        SupportIssueAttachment attachment,
        CancellationToken cancellationToken = default)
    {
        var absolutePath = GetAbsolutePath(attachment.RelativePath);
        if (!File.Exists(absolutePath))
        {
            return null;
        }

        return await File.ReadAllBytesAsync(absolutePath, cancellationToken);
    }

    private void EnsureIssueDirectory(Guid issueId)
    {
        var path = Path.Combine(options.Value.AttachmentStoragePath, issueId.ToString("D"));
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    private string GetAbsolutePath(string relativePath) =>
        Path.Combine(options.Value.AttachmentStoragePath, relativePath);

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
