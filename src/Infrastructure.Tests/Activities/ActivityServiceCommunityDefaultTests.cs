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

    [Fact]
    public async Task CreateAsync_CommunityDefaultWithBasicFields_BasicTenant_SkipsPreFill()
    {
        await using var dbContext = CreateDbContext();
        var templateId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var tenant = await dbContext.Tenants.FirstAsync();
        tenant.Plan = TenantPlan.Basic;
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

        Assert.Null(created.FormSchema);
    }

    [Fact]
    public async Task CreateAsync_CommunityDefaultWithCorePlusFields_BasicTenant_SkipsPreFill()
    {
        await using var dbContext = CreateDbContext();
        var templateId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var tenant = await dbContext.Tenants.FirstAsync();
        tenant.Plan = TenantPlan.Basic;
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
            Name = "Recipe template",
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "notes",
                        Type = FormFieldTypes.Textarea,
                        Label = "Notes",
                        Required = false,
                        VisibleWhen = new FormFieldVisibleWhen
                        {
                            FieldId = "guest",
                            EqualsValue = "yes",
                        },
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

        Assert.Null(created.FormSchema);
    }

    [Fact]
    public async Task PublishAsync_CoreTenantWithProStepsDraft_ThrowsFormSchemaPlanLocked()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var activityId = Guid.NewGuid();

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            Name = "Summer Clinic",
            Slug = "summer-clinic",
            Category = "Tennis",
            Schedule = "Weekly",
            Location = "Court A",
            CommunityLabel = "Youth",
            Status = ActivityStatus.Draft,
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Meta = new FormSchemaMeta { SplitIntoSteps = true },
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

        await Assert.ThrowsAsync<FormSchemaPlanLockedException>(
            () => service.PublishAsync(activityId));
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
            Plan = TenantPlan.Core,
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
