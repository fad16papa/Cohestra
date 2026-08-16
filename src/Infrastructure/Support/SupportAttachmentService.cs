using Cohestra.Domain.Support;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Support;

public sealed class SupportAttachmentService(IOptions<SupportSettings> options)
{
    private const int MaxFileNameLength = 255;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    };

    public async Task<SupportIssueAttachment> SaveAsync(
        Guid issueId,
        byte[] content,
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

        if (content.Length == 0)
        {
            throw new ArgumentException("Image file is empty.");
        }

        if (content.Length > settings.MaxFileBytes)
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
        await File.WriteAllBytesAsync(absolutePath, content, cancellationToken);

        return new SupportIssueAttachment
        {
            Id = attachmentId,
            SupportIssueId = issueId,
            FileName = TruncateFileName(Path.GetFileName(fileName)),
            ContentType = normalizedContentType,
            SizeBytes = content.Length,
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

    public void DeleteIssueAttachments(Guid issueId)
    {
        var issueDirectory = Path.Combine(options.Value.AttachmentStoragePath, issueId.ToString("D"));
        if (!Directory.Exists(issueDirectory))
        {
            return;
        }

        try
        {
            Directory.Delete(issueDirectory, recursive: true);
        }
        catch (IOException)
        {
            // Best-effort cleanup after failed create.
        }
        catch (UnauthorizedAccessException)
        {
            // Best-effort cleanup after failed create.
        }
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

    private static string TruncateFileName(string fileName) =>
        fileName.Length <= MaxFileNameLength
            ? fileName
            : fileName[..MaxFileNameLength];

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
