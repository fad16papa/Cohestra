namespace Cohestra.Application.WebsiteInquiries;

public interface IWebsiteInquiryService
{
    Task<WebsiteInquirySubmitResult> SubmitAsync(
        SubmitWebsiteInquiryCommand command,
        CancellationToken cancellationToken = default);
}

public sealed record SubmitWebsiteInquiryCommand(
    string Name,
    string? Email,
    string? Phone,
    string Message,
    bool ConsentGiven);

public sealed record WebsiteInquirySubmitResult
{
    public bool IsNotFound { get; init; }

    public bool IsPlanLocked { get; init; }

    public bool IsContactDisabled { get; init; }

    public string? ValidationError { get; init; }

    public Guid ClientId { get; init; }

    public bool ClientCreated { get; init; }

    public static WebsiteInquirySubmitResult NotFound() =>
        new() { IsNotFound = true };

    public static WebsiteInquirySubmitResult PlanLocked() =>
        new() { IsPlanLocked = true };

    public static WebsiteInquirySubmitResult ContactDisabled() =>
        new() { IsContactDisabled = true };

    public static WebsiteInquirySubmitResult Invalid(string validationError) =>
        new() { ValidationError = validationError };

    public static WebsiteInquirySubmitResult Created(Guid clientId, bool clientCreated) =>
        new() { ClientId = clientId, ClientCreated = clientCreated };
}
