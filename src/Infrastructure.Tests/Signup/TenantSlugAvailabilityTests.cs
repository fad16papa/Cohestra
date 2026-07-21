using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Signup;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Signup;

public sealed class TenantSlugAvailabilityTests
{
    [Fact]
    public async Task BuildSuggestionsAsync_skips_reserved_and_taken_slugs()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new CohestraDbContext(options);
        db.Tenants.Add(new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = "atelier-2",
            Name = "Taken",
            Plan = TenantPlan.Basic,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var suggestions = await TenantSlugAvailability.BuildSuggestionsAsync(
            db,
            "atelier",
            maxSuggestions: 3,
            CancellationToken.None);

        Assert.DoesNotContain("atelier-2", suggestions);
        Assert.All(suggestions, slug => Assert.Null(TenantSlugRules.ValidateForProvision(slug)));
    }
}
