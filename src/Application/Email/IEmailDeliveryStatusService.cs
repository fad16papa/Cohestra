using LeadGenerationCrm.Contracts.Email;

namespace LeadGenerationCrm.Application.Email;

public interface IEmailDeliveryStatusService
{
    Task<EmailDeliveryStatusResponse> GetStatusAsync(CancellationToken cancellationToken = default);
}
