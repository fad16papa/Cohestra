using Cohestra.Contracts.Reports;

namespace Cohestra.Application.Reports;

public interface IReportService
{
    Task<ReportResponse> GetReportAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default);

    Task<ReportCsvExportResponse> ExportReportCsvAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default);
}
