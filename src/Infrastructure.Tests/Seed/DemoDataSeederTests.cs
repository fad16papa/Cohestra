using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class DemoDataSeederTests
{
    [Fact]
    public void Personas_HaveUniqueNormalizedPhonesAndEmailsPerTenantRules()
    {
        var phones = new HashSet<string>(StringComparer.Ordinal);
        var emails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var persona in DemoDataSeedCatalog.Personas)
        {
            if (!string.IsNullOrWhiteSpace(persona.Phone))
            {
                var normalizedPhone = ClientContactNormalizer.NormalizePhone(persona.Phone, persona.PhoneCountry);
                Assert.NotNull(normalizedPhone);
                Assert.True(
                    phones.Add(normalizedPhone!),
                    $"Duplicate normalized phone in demo personas: {persona.FullName} ({normalizedPhone})");
            }

            if (!string.IsNullOrWhiteSpace(persona.Email))
            {
                var normalizedEmail = ClientContactNormalizer.NormalizeEmail(persona.Email);
                Assert.NotNull(normalizedEmail);
                Assert.True(
                    emails.Add(normalizedEmail!),
                    $"Duplicate normalized email in demo personas: {persona.FullName} ({normalizedEmail})");
            }
        }
    }

    [Fact]
    public async Task SeedDatabaseAsync_WhenEnabled_SeedsProductionLikeScenarioMatrix()
    {
        await using var dbContext = CreateDbContext();
        var settings = new DemoDataSeedSettings
        {
            Enabled = true,
            CommunityCount = 2,
            ActivitiesPerCommunity = 1,
            ClientCount = 20,
            RegistrationFillRate = 0.25,
        };

        await DemoDataSeeder.SeedDatabaseAsync(
            dbContext,
            settings,
            NullLogger.Instance);

        Assert.Equal(DemoDataSeedCatalog.Personas.Count, await dbContext.Clients
            .CountAsync(client => DemoDataSeedCatalog.Personas.Select(persona => persona.FullName).Contains(client.FullName)));

        var francis = await dbContext.Clients.SingleAsync(client => client.FullName == "Francis Decena");
        Assert.Equal(LeadStatus.Active, francis.LeadStatus);
        Assert.Equal("+6593395840", francis.Phone);
        Assert.Contains(
            await dbContext.ClientTimelineEvents
                .Where(item => item.ClientId == francis.Id)
                .Select(item => item.EventType)
                .ToListAsync(),
            type => type == ClientTimelineEventType.ViberInitiated);

        Assert.True(await dbContext.Clients.AnyAsync(client => client.IsMergeSuspect));
        Assert.True(await dbContext.Clients.AnyAsync(client => client.Phone == null));
        Assert.False(await dbContext.Clients.AnyAsync(client => client.FullName == "James Patel" && client.ConsentGiven));

        var fullActivity = await dbContext.Activities.SingleAsync(
            activity => activity.Slug == "demo-ikigai-pickleball-intro");
        Assert.Equal(5, fullActivity.MaxRegistrants);
        Assert.Equal(5, await dbContext.Registrations.CountAsync(registration => registration.ActivityId == fullActivity.Id));

        var draftActivity = await dbContext.Activities.SingleAsync(
            activity => activity.Slug == "demo-runners-draft-clinic");
        Assert.Equal(ActivityStatus.Draft, draftActivity.Status);
        Assert.Equal(0, await dbContext.Registrations.CountAsync(registration => registration.ActivityId == draftActivity.Id));

        Assert.True(await dbContext.EmailTemplates.AnyAsync());
        Assert.True(await dbContext.Campaigns.AnyAsync());
        Assert.True(await dbContext.ClientTimelineEvents.AnyAsync(
            item => item.EventType == ClientTimelineEventType.EmailCampaignSent));

        var tenant = await dbContext.Tenants.SingleAsync(item => item.Id == TenantIds.Default);
        Assert.Equal(TenantPlan.Pro, tenant.Plan);

        var duplicateRegistrationPairs = await dbContext.Registrations
            .GroupBy(registration => new { registration.ClientId, registration.ActivityId })
            .Where(group => group.Count() > 1)
            .CountAsync();

        Assert.Equal(0, duplicateRegistrationPairs);
    }

    [Fact]
    public async Task SeedDatabaseAsync_WhenEnabled_WipesExistingBusinessDataBeforeReseeding()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Clients.Add(new Client
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
            ClientCount = 12,
        };

        await DemoDataSeeder.SeedDatabaseAsync(
            dbContext,
            settings,
            NullLogger.Instance);

        Assert.DoesNotContain(
            await dbContext.Clients.Select(client => client.FullName).ToListAsync(),
            name => name == "Legacy Client");
        Assert.True(await dbContext.Registrations.AnyAsync());
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

        var dbContext = new CohestraDbContext(options);
        dbContext.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        dbContext.SaveChanges();
        return dbContext;
    }
}
