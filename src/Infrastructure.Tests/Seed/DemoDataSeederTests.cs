using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class DemoDataSeederTests
{
    [Fact]
    public async Task SeedDatabaseAsync_WhenEnabled_CreatesSixCommunitiesSixtyActivitiesAndSixThousandRegistrations()
    {
        await using var dbContext = CreateDbContext();
        var settings = new DemoDataSeedSettings
        {
            Enabled = true,
            CommunityCount = 6,
            ActivitiesPerCommunity = 10,
            ClientCount = 100,
        };

        await DemoDataSeeder.SeedDatabaseAsync(
            dbContext,
            settings,
            NullLogger.Instance);

        Assert.Equal(6, await dbContext.Communities.CountAsync());
        Assert.Equal(100, await dbContext.Clients.CountAsync());
        Assert.Equal(6000, await dbContext.Registrations.CountAsync());
        Assert.Equal(60, await dbContext.Activities.CountAsync());
        Assert.Equal(3, await dbContext.Categories.CountAsync());

        var duplicateRegistrationPairs = await dbContext.Registrations
            .GroupBy(registration => new { registration.ClientId, registration.ActivityId })
            .Where(group => group.Count() > 1)
            .CountAsync();

        Assert.Equal(0, duplicateRegistrationPairs);

        var registrationNumbers = await dbContext.Registrations
            .Select(registration => registration.RegistrationNumber)
            .ToListAsync();

        Assert.Equal(6000, registrationNumbers.Distinct(StringComparer.Ordinal).Count());
        Assert.All(registrationNumbers, number => Assert.Matches("^REG\\d{14}$", number));
    }

    [Fact]
    public async Task SeedDatabaseAsync_WhenEnabled_WipesExistingBusinessDataBeforeReseeding()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Clients.Add(new Domain.Clients.Client
        {
            Id = Guid.NewGuid(),
            FullName = "Legacy Client",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var settings = new DemoDataSeedSettings
        {
            Enabled = true,
            CommunityCount = 1,
            ActivitiesPerCommunity = 1,
            ClientCount = 1,
        };

        await DemoDataSeeder.SeedDatabaseAsync(
            dbContext,
            settings,
            NullLogger.Instance);

        Assert.DoesNotContain(
            await dbContext.Clients.Select(client => client.FullName).ToListAsync(),
            name => name == "Legacy Client");
        Assert.Equal(1, await dbContext.Registrations.CountAsync());
    }

    [Fact]
    public async Task SeedDatabaseAsync_WhenDisabled_DoesNothing()
    {
        await using var dbContext = CreateDbContext();
        var settings = new DemoDataSeedSettings { Enabled = false };

        await DemoDataSeeder.SeedDatabaseAsync(
            dbContext,
            settings,
            NullLogger.Instance);

        Assert.Equal(0, await dbContext.Communities.CountAsync());
        Assert.Equal(0, await dbContext.Clients.CountAsync());
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
