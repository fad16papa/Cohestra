using LeadGenerationCrm.Contracts.Activities;

namespace LeadGenerationCrm.Application.Activities;

public interface ICategoryService
{
    Task<CategoryListResponse> ListAsync(CancellationToken cancellationToken = default);

    Task<CategoryResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<CategoryResponse> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<CategoryResponse?> UpdateAsync(
        Guid id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
