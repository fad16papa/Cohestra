namespace Cohestra.Contracts.WebsiteInquiries;

public sealed record SubmitWebsiteInquiryRequest(
    string Name,
    string? Email,
    string? Phone,
    string Message,
    bool ConsentGiven);

public sealed record SubmitWebsiteInquiryResponse(
    string Status,
    string Message,
    Guid ClientId,
    bool ClientCreated);
