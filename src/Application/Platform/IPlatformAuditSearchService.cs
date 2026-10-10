using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformAuditSearchService
{
    Task<PlatformAuditSearchResult> SearchAsync(
        PlatformAuditSearchQuery query,
        CancellationToken cancellationToken = default);

    Task<PlatformAuditExportResult> ExportAsync(
        PlatformAuditSearchQuery query,
        CancellationToken cancellationToken = default);
}

public sealed record PlatformAuditSearchResult(
    bool Succeeded,
    PlatformAuditListResponse? Value,
    string? Error);

public sealed record PlatformAuditExportResult(
    bool Succeeded,
    byte[]? Utf8Csv,
    string? FileName,
    string? Error);
