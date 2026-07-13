namespace LeadGenerationCrm.Contracts.Auth;

public sealed record RegisterOperatorRequest(
    string Email,
    string Nickname,
    string Password);
