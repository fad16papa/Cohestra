using Cohestra.Contracts.Intelligence;

namespace Cohestra.Application.Intelligence;

public interface IIntelligenceBriefService
{
    Task<IntelligenceBriefResponse> GetBriefAsync(CancellationToken cancellationToken = default);
}
