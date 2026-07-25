using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantHostResolverDoorTests
{
    [Fact]
    public async Task ResolveDoorAsync_returns_suspended_for_suspended_tenant()
    {
        await using var db = new CohestraDbContext(
            new DbContextOptionsBuilder<CohestraDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);

        var tenantId = Guid.CreateVersion7();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "paused",
            Name = "Paused Org",
            Status = TenantStatus.Suspended,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var resolver = new TenantHostResolver(db, new ConfigurationBuilder().Build());
        var door = await resolver.ResolveDoorAsync("paused.localhost");

        Assert.Equal(TenantDoorKind.Suspended, door.Kind);
        Assert.Equal("Paused Org", door.TenantName);
    }
}
