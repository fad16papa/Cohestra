namespace Cohestra.Contracts.Admin;

public sealed record UpdateTenantEmbedSettingsRequest(IReadOnlyList<string> AllowedEmbedOrigins);

public sealed record TenantEmbedSettingsResponse(IReadOnlyList<string> AllowedEmbedOrigins);
