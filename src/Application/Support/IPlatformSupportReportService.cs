using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Support;

public interface IPlatformSupportReportService
{
    Task<PlatformSupportReportResponse> GetReportAsync(
        PlatformSupportReportQuery query,
        CancellationToken cancellationToken = default);

    Task<(byte[] Content, string FileName)> ExportCsvAsync(
        PlatformSupportReportQuery query,
        CancellationToken cancellationToken = default);
}
