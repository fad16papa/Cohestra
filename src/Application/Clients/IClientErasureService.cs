namespace Cohestra.Application.Clients;

public enum ClientErasureError
{
    None,
    Validation,
    NotFound,
}

public sealed record ClientErasureCounts(
    int Registrations,
    int TimelineEvents,
    int CampaignRecipients);

public sealed record ClientErasureResult(
    bool Succeeded,
    ClientErasureError Error,
    string? Detail,
    ClientErasureCounts? Counts)
{
    public static ClientErasureResult Ok(ClientErasureCounts counts) =>
        new(true, ClientErasureError.None, null, counts);

    public static ClientErasureResult Fail(ClientErasureError error, string detail) =>
        new(false, error, detail, null);
}

public interface IClientErasureService
{
    Task<ClientErasureResult> EraseAsync(
        Guid tenantId,
        Guid clientId,
        Guid actorUserId,
        string reason,
        CancellationToken cancellationToken = default);
}
