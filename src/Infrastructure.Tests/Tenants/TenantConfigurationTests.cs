using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantConfigurationTests
{
    [Fact]
    public void Tenants_Slug_Has_Unique_Index()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new CohestraDbContext(options);
        var entityType = db.Model.FindEntityType(typeof(Tenant));
        Assert.NotNull(entityType);

        var slugIndex = entityType.GetIndexes()
            .SingleOrDefault(index =>
                index.IsUnique
                && index.Properties.Count == 1
                && index.Properties[0].Name == nameof(Tenant.Slug));

        Assert.NotNull(slugIndex);
        Assert.Equal("tenants", entityType.GetTableName());
    }
}
