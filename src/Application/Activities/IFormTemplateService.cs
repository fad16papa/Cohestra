using Cohestra.Contracts.Activities;

namespace Cohestra.Application.Activities;

public interface IFormTemplateService
{
    Task<FormTemplateListResponse> ListAsync(CancellationToken cancellationToken = default);

    Task<FormTemplateResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<FormTemplateResponse> CreateAsync(
        CreateFormTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<FormTemplateResponse?> UpdateAsync(
        Guid id,
        UpdateFormTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
