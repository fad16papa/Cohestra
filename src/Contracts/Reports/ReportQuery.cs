namespace Cohestra.Contracts.Reports;

public sealed record ReportQuery(
    string Preset,
    DateOnly? From = null,
    DateOnly? To = null,
    Guid? ActivityId = null,
    string? Community = null,
    string? LeadStatus = null,
    string? ReferralSource = null);
