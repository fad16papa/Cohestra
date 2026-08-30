namespace Cohestra.Contracts.PublicEmbed;

public sealed record PublicEmbedOriginsResponse(IReadOnlyList<string> AllowedEmbedOrigins);
