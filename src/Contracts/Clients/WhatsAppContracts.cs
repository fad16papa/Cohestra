namespace LeadGenerationCrm.Contracts.Clients;

public sealed record RecordWhatsAppFollowUpRequest(
    string Status,
    string? Note);
