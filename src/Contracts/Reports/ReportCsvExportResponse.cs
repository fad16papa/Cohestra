namespace Cohestra.Contracts.Reports;

public sealed record ReportCsvExportResponse(
    byte[] Content,
    string FileName,
    int RegistrationRowCount);
