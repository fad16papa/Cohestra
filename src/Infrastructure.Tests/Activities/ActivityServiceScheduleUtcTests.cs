using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityServiceScheduleUtcTests
{
    private static readonly Guid TestTenantId = Guid.Parse("66666666-6666-6666-6666-666666666666");

    [Fact]
    public void TryParseStartsAt_SingaporeWeekday_HasNonUtcOffset()
    {
        var parsed = ActivityScheduleParser.TryParseStartsAt("Sat 10:00", "Asia/Singapore");

        Assert.NotNull(parsed);
        Assert.NotEqual(TimeSpan.Zero, parsed!.Value.Offset);
    }

    [Fact]
    public async Task CreateAsync_SingaporeWeekdaySchedule_PersistsUtcScheduledStartsAt()
    {
        await using var dbContext = CreateDbContext("Asia/Singapore");
        SeedCatalog(dbContext);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var created = await service.CreateAsync(
            new CreateActivityRequest(
                "19-5 harness a utc",
                "19.5 Category",
                "Sat 10:00",
                "UAT harness",
                "19.5 Harness",
                Status: "draft"));

        Assert.NotNull(created.ScheduledStartsAt);
        Assert.Equal(TimeSpan.Zero, created.ScheduledStartsAt!.Value.Offset);
        Assert.Equal(10, created.ScheduledStartsAt.Value.ToOffset(TimeSpan.FromHours(8)).Hour);
    }

    private static void SeedCatalog(CohestraDbContext dbContext)
    {
        var now = DateTimeOffset.UtcNow;
        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            Name = "19.5 Harness",
            CreatedAt = now,
            UpdatedAt = now,
        });
        dbContext.Categories.Add(new Category
        {
            Id = Guid.NewGuid(),
            Name = "19.5 Category",
            CreatedAt = now,
            UpdatedAt = now,
        });
    }

    private static CohestraDbContext CreateDbContext(string registrationTimeZoneId)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "creativorare");

        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var dbContext = new CohestraDbContext(options, currentTenant);
        var now = DateTimeOffset.UtcNow;
        dbContext.Tenants.Add(new Tenant
        {
            Id = TestTenantId,
            Slug = "creativorare",
            Name = "CreativoRare",
            Plan = TenantPlan.Pro,
            CreatedAt = now,
            UpdatedAt = now,
            RegistrationTimeZoneId = registrationTimeZoneId,
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private static ActivityService CreateService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "creativorare");
        var redis = ConnectionMultiplexer.Connect(
            "127.0.0.1:6379,abortConnect=false,connectTimeout=50,syncTimeout=50");
        return new ActivityService(
            dbContext,
            Options.Create(new PublicWebOptions()),
            new RedisPublicActivityCache(redis),
            currentTenant);
    }
}
