using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Support;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueNumberGeneratorTests
{
    [Fact]
    public void Format_UsesSupPrefixDateAndSixDigitSequence()
    {
        var timestamp = new DateTimeOffset(2026, 8, 16, 12, 0, 0, TimeSpan.Zero);

        Assert.Equal("SUP20260816000042", SupportIssueNumberGenerator.Format(timestamp, 42));
    }

    [Fact]
    public async Task GenerateNextAsync_IncrementsWithinSameUtcDay()
    {
        await using var dbContext = CreateDbContext();
        var generator = new SupportIssueNumberGenerator(dbContext);
        var timestamp = new DateTimeOffset(2026, 8, 16, 8, 0, 0, TimeSpan.Zero);

        dbContext.SupportIssues.Add(new Domain.Support.SupportIssue
        {
            Id = Guid.CreateVersion7(),
            TenantId = Guid.CreateVersion7(),
            IssueNumber = "SUP20260816000007",
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = "Test",
            Description = "Test",
            OperatorEmail = "operator@example.com",
            OperatorDisplayName = "Operator",
            TenantSlug = "demo",
            TenantName = "Demo",
            CreatedAt = timestamp,
            UpdatedAt = timestamp,
        });
        await dbContext.SaveChangesAsync();

        var next = await generator.GenerateNextAsync(timestamp);

        Assert.Equal("SUP20260816000008", next);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
