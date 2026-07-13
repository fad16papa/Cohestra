using LeadGenerationCrm.Contracts.Campaigns;
using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Infrastructure.Campaigns;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Tests.Campaigns;

public sealed class ClientSegmentServiceTests
{
    [Fact]
    public async Task PreviewAsync_CommunityWithConsentOnly_ReturnsConsentedClientsOnly()
    {
        await using var dbContext = CreateDbContext();
        var activity = SeedActivity(dbContext, "Eastside Tennis");
        var consented = SeedClient(
            dbContext,
            "Consented Lead",
            consentGiven: true,
            email: "yes@example.com");
        var noConsent = SeedClient(
            dbContext,
            "No Consent Lead",
            consentGiven: false,
            email: "no@example.com");

        dbContext.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000001",
                ActivityId = activity.Id,
                ClientId = consented.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000002",
                ActivityId = activity.Id,
                ClientId = noConsent.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });

        await dbContext.SaveChangesAsync();

        var service = new ClientSegmentService(dbContext);
        var preview = await service.PreviewAsync(
            new ClientSegmentQueryRequest(
                ActivityIds: null,
                LeadStatus: null,
                Community: "Eastside Tennis",
                ClientIds: null,
                ConsentOnly: true));

        Assert.Equal(1, preview.TotalCount);
        Assert.Equal(1, preview.WithEmailCount);
        Assert.Equal(1, preview.CommunityWithEmailCount);
        Assert.Equal(0, preview.AdditionalWithEmailCount);
        Assert.Equal(0, preview.WithoutConsentCount);
        Assert.Equal("Consented Lead", preview.PreviewItems[0].FullName);
    }

    [Fact]
    public async Task PreviewAsync_WithAdditionalRecipients_UnionsOutsideCommunityConsentedLeads()
    {
        await using var dbContext = CreateDbContext();
        var tennisActivity = SeedActivity(dbContext, "Eastside Tennis");
        var pickleballActivity = SeedActivity(dbContext, "Marina Pickleball");
        var tennisLead = SeedClient(
            dbContext,
            "Tennis Lead",
            consentGiven: true,
            email: "tennis@example.com");
        var outsideLead = SeedClient(
            dbContext,
            "Pickleball Lead",
            consentGiven: true,
            email: "pickle@example.com");
        var noConsentOutside = SeedClient(
            dbContext,
            "No Consent Outside",
            consentGiven: false,
            email: "nope@example.com");

        dbContext.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000001",
                ActivityId = tennisActivity.Id,
                ClientId = tennisLead.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000002",
                ActivityId = pickleballActivity.Id,
                ClientId = outsideLead.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000003",
                ActivityId = pickleballActivity.Id,
                ClientId = noConsentOutside.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });

        await dbContext.SaveChangesAsync();

        var service = new ClientSegmentService(dbContext);
        var preview = await service.PreviewAsync(
            new ClientSegmentQueryRequest(
                ActivityIds: null,
                LeadStatus: null,
                Community: "Eastside Tennis",
                ClientIds: null,
                ConsentOnly: true,
                AdditionalClientIds: [outsideLead.Id, noConsentOutside.Id]));

        Assert.Equal(2, preview.TotalCount);
        Assert.Equal(2, preview.WithEmailCount);
        Assert.Equal(1, preview.CommunityWithEmailCount);
        Assert.Equal(1, preview.AdditionalWithEmailCount);
        Assert.Contains(
            preview.PreviewItems,
            item => item.FullName == "Pickleball Lead" && item.IsAdditionalRecipient);
    }

    [Fact]
    public async Task ResolveClientIdsAsync_DeduplicatesCommunityAndAdditionalOverlap()
    {
        await using var dbContext = CreateDbContext();
        var activity = SeedActivity(dbContext, "Eastside Tennis");
        var lead = SeedClient(
            dbContext,
            "Shared Lead",
            consentGiven: true,
            email: "shared@example.com");

        dbContext.Registrations.Add(
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000001",
                ActivityId = activity.Id,
                ClientId = lead.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });

        await dbContext.SaveChangesAsync();

        var service = new ClientSegmentService(dbContext);
        var ids = await service.ResolveClientIdsAsync(
            new ClientSegmentQueryRequest(
                ActivityIds: null,
                LeadStatus: null,
                Community: "Eastside Tennis",
                ClientIds: null,
                ConsentOnly: true,
                AdditionalClientIds: [lead.Id]));

        Assert.Single(ids);
    }

    [Fact]
    public void Validate_RejectsMoreThanFiftyAdditionalRecipients()
    {
        var ids = Enumerable.Range(0, 51).Select(_ => Guid.NewGuid()).ToList();

        var error = Assert.Throws<ArgumentException>(() =>
            ClientSegmentQueryValidator.Validate(
                new ClientSegmentQueryRequest(
                    ActivityIds: null,
                    LeadStatus: null,
                    Community: "Eastside Tennis",
                    ClientIds: null,
                    AdditionalClientIds: ids)));

        Assert.Contains("50", error.Message);
    }

    [Fact]
    public async Task PreviewAsync_ProfessionFilter_MatchesPartialProfession()
    {
        await using var dbContext = CreateDbContext();
        var client = SeedClient(
            dbContext,
            "Engineer Lead",
            consentGiven: true,
            email: "engineer@example.com");
        client.Profession = "Software Engineer";

        await dbContext.SaveChangesAsync();

        var service = new ClientSegmentService(dbContext);
        var preview = await service.PreviewAsync(
            new ClientSegmentQueryRequest(
                ActivityIds: null,
                LeadStatus: null,
                Community: null,
                ClientIds: null,
                Profession: "engineer",
                ConsentOnly: true));

        Assert.Equal(1, preview.TotalCount);
    }

    private static Activity SeedActivity(LeadGenerationCrmDbContext dbContext, string community)
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Activity",
            Slug = $"slug-{Guid.NewGuid():N}",
            Category = "tennis",
            Schedule = "Weekly",
            Location = "Court",
            CommunityLabel = community,
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Activities.Add(activity);
        return activity;
    }

    private static Client SeedClient(
        LeadGenerationCrmDbContext dbContext,
        string fullName,
        bool consentGiven,
        string email)
    {
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email,
            NormalizedEmail = email.ToLowerInvariant(),
            ConsentGiven = consentGiven,
            LeadStatus = LeadStatus.New,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Clients.Add(client);
        return client;
    }

    private static LeadGenerationCrmDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LeadGenerationCrmDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new LeadGenerationCrmDbContext(options);
    }
}
