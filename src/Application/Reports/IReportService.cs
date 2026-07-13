using LeadGenerationCrm.Contracts.Reports;

namespace LeadGenerationCrm.Application.Reports;

public interface IReportService
{
    Task<ReportResponse> GetReportAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default);

    Task<ReportCsvExportResponse> ExportReportCsvAsync(
        ReportQuery query,
        CancellationToken cancellationToken = default);
}
