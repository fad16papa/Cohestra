using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationNumberGeneratorTests
{
    [Fact]
    public void Format_UsesRegPrefixDateAndSixDigitSequence()
    {
        var timestamp = new DateTimeOffset(2026, 6, 16, 12, 0, 0, TimeSpan.Zero);

        Assert.Equal("REG20260616000042", RegistrationNumberGenerator.Format(timestamp, 42));
    }

    [Fact]
    public async Task GenerateNextAsync_IncrementsWithinSameUtcDay()
    {
        await using var dbContext = CreateDbContext();
        var generator = new RegistrationNumberGenerator(dbContext);
        var timestamp = new DateTimeOffset(2026, 6, 16, 8, 0, 0, TimeSpan.Zero);

        dbContext.Registrations.Add(new Domain.Registrations.Registration
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = "REG20260616000007",
            ActivityId = Guid.NewGuid(),
            ClientId = Guid.NewGuid(),
            Answers = [],
            CreatedAt = timestamp,
        });
        await dbContext.SaveChangesAsync();

        var next = await generator.GenerateNextAsync(timestamp);

        Assert.Equal("REG20260616000008", next);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
