using Cohestra.Application.Activities;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Activities;

public sealed class CategoryService(CohestraDbContext dbContext) : ICategoryService
{
    public async Task<CategoryListResponse> ListAsync(CancellationToken cancellationToken = default)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);

        var items = new List<CategoryListItemResponse>(categories.Count);

        foreach (var category in categories)
        {
            var activityCount = await dbContext.Activities
                .AsNoTracking()
                .CountAsync(activity => activity.Category == category.Name, cancellationToken);

            items.Add(new CategoryListItemResponse(
                category.Id,
                category.Name,
                activityCount,
                category.CreatedAt,
                category.UpdatedAt));
        }

        return new CategoryListResponse(items);
    }

    public async Task<CategoryResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var category = await dbContext.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (category is null)
        {
            return null;
        }

        var activityCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(activity => activity.Category == category.Name, cancellationToken);

        return new CategoryResponse(
            category.Id,
            category.Name,
            activityCount,
            category.CreatedAt,
            category.UpdatedAt);
    }

    public async Task<CategoryResponse> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);

        if (await NameExistsAsync(name, null, cancellationToken))
        {
            throw new ArgumentException("A category with this name already exists.");
        }

        var now = DateTimeOffset.UtcNow;
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CategoryResponse(category.Id, category.Name, 0, category.CreatedAt, category.UpdatedAt);
    }

    public async Task<CategoryResponse?> UpdateAsync(
        Guid id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (category is null)
        {
            return null;
        }

        var nextName = NormalizeName(request.Name);

        if (await NameExistsAsync(nextName, category.Id, cancellationToken))
        {
            throw new ArgumentException("A category with this name already exists.");
        }

        var previousName = category.Name;

        if (!string.Equals(previousName, nextName, StringComparison.Ordinal))
        {
            var activities = await dbContext.Activities
                .Where(activity => activity.Category == previousName)
                .ToListAsync(cancellationToken);

            foreach (var activity in activities)
            {
                activity.Category = nextName;
                activity.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        category.Name = nextName;
        category.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        var activityCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(activity => activity.Category == category.Name, cancellationToken);

        return new CategoryResponse(
            category.Id,
            category.Name,
            activityCount,
            category.CreatedAt,
            category.UpdatedAt);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (category is null)
        {
            return false;
        }

        var inUse = await dbContext.Activities
            .AnyAsync(activity => activity.Category == category.Name, cancellationToken);

        if (inUse)
        {
            throw new ArgumentException(
                "This category is linked to one or more activities. Reassign those activities before deleting.");
        }

        dbContext.Categories.Remove(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> NameExistsAsync(
        string name,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(
                item =>
                    item.Name == name &&
                    (!excludeId.HasValue || item.Id != excludeId.Value),
                cancellationToken);
    }

    private static string NormalizeName(string value)
    {
        var name = value?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Category name is required.");
        }

        if (name.Length > 100)
        {
            throw new ArgumentException("Category name must be 100 characters or fewer.");
        }

        return name;
    }
}
