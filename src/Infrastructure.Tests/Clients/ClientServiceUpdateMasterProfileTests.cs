using Cohestra.Contracts.Clients;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Clients;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ClientServiceUpdateMasterProfileTests
{
    [Fact]
    public async Task UpdateMasterProfileAsync_UpdatesFieldsAndNormalizesPhone()
    {
        await using var dbContext = CreateDbContext();
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Old Name",
            Phone = "+6591234567",
            NormalizedPhone = "+6591234567",
            LeadStatus = LeadStatus.New,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Clients.Add(client);
        await dbContext.SaveChangesAsync();

        var service = new ClientService(dbContext);
        var result = await service.UpdateMasterProfileAsync(
            client.Id,
            new UpdateClientMasterProfileRequest(
                FullName: "Francis Decena",
                Phone: "92918554",
                PhoneCountry: "SG",
                Email: "operator@example.com",
                Profession: "Software Engineer",
                Nationality: "Filipino",
                Residency: null,
                ConsentGiven: true,
                ReferralSource: "friend",
                Notes: "VIP lead"),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Francis Decena", result.FullName);
        Assert.Equal("+6592918554", result.Phone);
        Assert.Equal("operator@example.com", result.Email);
        Assert.Equal("Software Engineer", result.Profession);
        Assert.True(result.ConsentGiven);
        Assert.Equal("VIP lead", result.Notes);
    }

    [Fact]
    public async Task UpdateMasterProfileAsync_RejectsDuplicatePhone()
    {
        await using var dbContext = CreateDbContext();
        var existing = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Existing",
            Phone = "+6591111111",
            NormalizedPhone = "+6591111111",
            LeadStatus = LeadStatus.New,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var target = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Target",
            LeadStatus = LeadStatus.New,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Clients.AddRange(existing, target);
        await dbContext.SaveChangesAsync();

        var service = new ClientService(dbContext);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateMasterProfileAsync(
                target.Id,
                new UpdateClientMasterProfileRequest(
                    FullName: "Target",
                    Phone: "91111111",
                    PhoneCountry: "SG",
                    Email: null,
                    Profession: null,
                    Nationality: null,
                    Residency: null,
                    ConsentGiven: false,
                    ReferralSource: null,
                    Notes: null),
                CancellationToken.None));

        Assert.Contains("phone", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
