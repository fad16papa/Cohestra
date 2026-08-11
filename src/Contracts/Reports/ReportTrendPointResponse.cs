namespace Cohestra.Contracts.Reports;

public sealed record ReportTrendPointResponse(
    DateOnly Date,
    int Registrations,
    int NewClients);
