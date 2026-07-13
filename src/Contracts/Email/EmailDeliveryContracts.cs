namespace LeadGenerationCrm.Contracts.Email;

public sealed record EmailDeliveryChecklistItemResponse(
    string Id,
    string Title,
    string Detail,
    string Status,
    string? ActionHint);

public sealed record EmailDeliveryStatusResponse(
    bool IsReady,
    bool ApiKeyConfigured,
    bool SandboxMode,
    string FromEmail,
    string FromName,
    IReadOnlyList<EmailDeliveryChecklistItemResponse> Checklist);
