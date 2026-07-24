using Cohestra.Contracts.PublicDoor;

namespace Cohestra.Application.PublicDoor;

public interface IPublicDoorService
{
    Task<PublicDoorResponse> GetAsync(string? hostHeader, CancellationToken cancellationToken = default);
}
