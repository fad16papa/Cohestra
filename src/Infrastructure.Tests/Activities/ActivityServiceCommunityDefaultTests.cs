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

public sealed class ActivityServiceCommunityDefaultTests
{
    private static readonly Guid TestTenantId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    [Fact]
    public async Task CreateAsync_CommunityWithDefaultTemplate_PrefillsFormSchema()
    {
        await using var dbContext = CreateDbContext();
        var templateId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            Name = "Youth",
            DefaultFormTemplateId = templateId,
            CreatedAt = now,
            UpdatedAt = now,
        });
        dbContext.Categories.Add(new Category
        {
            Id = Guid.NewGuid(),
            Name = "Tennis",
            CreatedAt = now,
            UpdatedAt = now,
        });
        dbContext.TenantFormTemplates.Add(new TenantFormTemplate
        {
            Id = templateId,
            Name = "Saturday recipe",
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "phone",
                        Type = FormFieldTypes.Phone,
                        Label = "Mobile",
                        Required = true,
                        PhoneCountry = "SG",
                    },
                ],
            },
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var created = await service.CreateAsync(
            new CreateActivityRequest(
                "Summer Clinic",
                "Tennis",
                "Weekly",
                "Court A",
                "Youth",
                Status: "draft"));

        Assert.NotNull(created.FormSchema);
        Assert.Single(created.FormSchema!.Fields);
        Assert.Equal("phone", created.FormSchema.Fields[0].Id);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "test");

        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var dbContext = new CohestraDbContext(options, currentTenant);
        var now = DateTimeOffset.UtcNow;
        dbContext.Tenants.Add(new Tenant
        {
            Id = TestTenantId,
            Slug = "test",
            Name = "Test Tenant",
            CreatedAt = now,
            UpdatedAt = now,
            RegistrationTimeZoneId = "UTC",
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private static ActivityService CreateService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "test");
        var redis = ConnectionMultiplexer.Connect(
            "127.0.0.1:6379,abortConnect=false,connectTimeout=50,syncTimeout=50");
        return new ActivityService(
            dbContext,
            Options.Create(new PublicWebOptions()),
            new RedisPublicActivityCache(redis),
            currentTenant);
    }
}
