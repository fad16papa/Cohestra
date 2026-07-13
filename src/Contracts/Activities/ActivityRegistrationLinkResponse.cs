namespace LeadGenerationCrm.Contracts.Activities;

public sealed record ActivityRegistrationLinkResponse(
    string Url,
    string Slug,
    string Path);
