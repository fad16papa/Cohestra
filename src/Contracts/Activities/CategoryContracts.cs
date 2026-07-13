namespace Cohestra.Contracts.Activities;

public sealed record CategoryListItemResponse(
    Guid Id,
    string Name,
    int ActivityCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CategoryListResponse(IReadOnlyList<CategoryListItemResponse> Items);

public sealed record CategoryResponse(
    Guid Id,
    string Name,
    int ActivityCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateCategoryRequest(string Name);

public sealed record UpdateCategoryRequest(string Name);
