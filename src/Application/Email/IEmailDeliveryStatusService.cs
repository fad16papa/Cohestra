using Cohestra.Contracts.Email;

namespace Cohestra.Application.Email;

public interface IEmailDeliveryStatusService
{
    Task<EmailDeliveryStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default);
}
