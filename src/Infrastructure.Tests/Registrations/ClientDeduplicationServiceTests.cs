using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Infrastructure.Persistence;
using LeadGenerationCrm.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Tests.Registrations;

/// <summary>
/// ATDD red-phase matrix for Story 3.3 — client deduplication and merge-suspect rules.
/// </summary>
public sealed class ClientDeduplicationServiceTests
{
    [Fact]
    public async Task FindOrCreateAsync_PhoneMatch_UpdatesExistingClientInsteadOfCreatingDuplicate()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var existingId = Guid.NewGuid();

        dbContext.Clients.Add(new Client
        {
            Id = existingId,
            FullName = "Elena Santos",
            Phone = "09171234567",
            NormalizedPhone = "+639171234567",
            Email = "elena@example.com",
            NormalizedEmail = "elena@example.com",
            LeadStatus = LeadStatus.New,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "Elena Santos",
            phone: "9171234567",
            normalizedPhone: "+639171234567",
            email: "elena@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now.AddMinutes(1));

        Assert.False(created);
        Assert.Equal(existingId, client.Id);
        Assert.Equal(1, await dbContext.Clients.CountAsync());
    }

    [Fact]
    public async Task FindOrCreateAsync_PhoneMatchWithConflictingEmail_FlagsMergeSuspectWithoutOverwritingEmail()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;

        dbContext.Clients.Add(new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Elena Santos",
            Phone = "09171234567",
            NormalizedPhone = "+639171234567",
            Email = "elena@example.com",
            NormalizedEmail = "elena@example.com",
            LeadStatus = LeadStatus.New,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "Elena Santos",
            phone: "09171234567",
            normalizedPhone: "+639171234567",
            email: "different@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now.AddMinutes(1));

        Assert.False(created);
        Assert.True(client.IsMergeSuspect);
        Assert.Equal("elena@example.com", client.Email);
        Assert.Equal("elena@example.com", client.NormalizedEmail);
    }

    [Fact]
    public async Task FindOrCreateAsync_PhoneMatchWithEmailOwnedByAnotherClient_FlagsMergeSuspectWithoutAssigningEmail()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var phoneClientId = Guid.NewGuid();

        dbContext.Clients.AddRange(
            new Client
            {
                Id = phoneClientId,
                FullName = "Elena Santos",
                Phone = "09171234567",
                NormalizedPhone = "+639171234567",
                LeadStatus = LeadStatus.New,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Work Contact",
                Email = "work@example.com",
                NormalizedEmail = "work@example.com",
                LeadStatus = LeadStatus.New,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await dbContext.SaveChangesAsync();

        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "Elena Santos",
            phone: "09171234567",
            normalizedPhone: "+639171234567",
            email: "work@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now.AddMinutes(1));
        await dbContext.SaveChangesAsync();

        Assert.False(created);
        Assert.Equal(phoneClientId, client.Id);
        Assert.True(client.IsMergeSuspect);
        Assert.Null(client.Email);
        Assert.Null(client.NormalizedEmail);
        Assert.Equal(2, await dbContext.Clients.CountAsync());
    }

    [Fact]
    public async Task FindOrCreateAsync_PhoneAndEmailMatchDifferentClients_FlagsMergeSuspectOnPhoneClient()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var phoneClientId = Guid.NewGuid();

        dbContext.Clients.AddRange(
            new Client
            {
                Id = phoneClientId,
                FullName = "Elena Santos",
                Phone = "09171234567",
                NormalizedPhone = "+639171234567",
                Email = "elena@example.com",
                NormalizedEmail = "elena@example.com",
                LeadStatus = LeadStatus.New,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Work Contact",
                Email = "work@example.com",
                NormalizedEmail = "work@example.com",
                LeadStatus = LeadStatus.New,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await dbContext.SaveChangesAsync();

        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "Elena Santos",
            phone: "9171234567",
            normalizedPhone: "+639171234567",
            email: "work@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now.AddMinutes(1));

        Assert.False(created);
        Assert.Equal(phoneClientId, client.Id);
        Assert.True(client.IsMergeSuspect);
        Assert.Equal("elena@example.com", client.Email);
    }

    [Fact]
    public async Task FindOrCreateAsync_EmailMatchWhenPhoneMissing_UpdatesExistingClient()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var existingId = Guid.NewGuid();

        dbContext.Clients.Add(new Client
        {
            Id = existingId,
            FullName = "Elena Santos",
            Email = "elena@example.com",
            NormalizedEmail = "elena@example.com",
            LeadStatus = LeadStatus.New,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "Elena Santos",
            email: "elena@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now.AddMinutes(1));

        Assert.False(created);
        Assert.Equal(existingId, client.Id);
        Assert.False(client.IsMergeSuspect);
    }

    [Fact]
    public async Task FindOrCreateAsync_NoMatch_CreatesNewClient()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var service = new ClientDeduplicationService(dbContext);
        var profile = CreateProfile(
            name: "New Person",
            phone: "09181234567",
            normalizedPhone: "+639181234567",
            email: "new@example.com");

        var (client, created) = await service.FindOrCreateAsync(profile, now);

        Assert.True(created);
        Assert.Equal("New Person", client.FullName);
        Assert.Equal(EntityState.Added, dbContext.Entry(client).State);
    }

    private static ExtractedClientProfile CreateProfile(
        string name,
        string? phone = null,
        string? normalizedPhone = null,
        string? email = null)
    {
        return new ExtractedClientProfile(
            NameFromForm: name,
            DisplayName: name,
            Phone: phone,
            NormalizedPhone: normalizedPhone ?? phone,
            Email: email,
            NormalizedEmail: email?.Trim().ToLowerInvariant(),
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: false,
            ReferralSource: null);
    }

    private static LeadGenerationCrmDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LeadGenerationCrmDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new LeadGenerationCrmDbContext(options);
    }
}
