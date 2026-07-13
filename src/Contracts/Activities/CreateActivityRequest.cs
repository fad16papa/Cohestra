namespace Cohestra.Contracts.Activities;

public sealed record CreateActivityRequest(
    string Name,
    string Category,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? Status);
