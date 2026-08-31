using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class CommunityDefaultTemplateServiceTests
{
    private static readonly Guid TenantId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    [Fact]
    public async Task SetDefaultFormTemplateAsync_CoreTenant_SetsDefault()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Core);
        var service = CreateCommunityService(dbContext);
        var templateId = await SeedTemplateAsync(dbContext, "Saturday recipe");
        var community = await SeedCommunityAsync(dbContext, "Youth");

        var updated = await service.SetDefaultFormTemplateAsync(
            community.Id,
            new SetCommunityDefaultFormTemplateRequest(templateId));

        Assert.NotNull(updated);
        Assert.Equal(templateId, updated!.DefaultFormTemplateId);
        Assert.Equal("Saturday recipe", updated.DefaultFormTemplateName);
    }

    [Fact]
    public async Task SetDefaultFormTemplateAsync_BasicTenant_ThrowsPlanLocked()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Basic);
        var service = CreateCommunityService(dbContext);
        var templateId = await SeedTemplateAsync(dbContext, "Basic template");
        var community = await SeedCommunityAsync(dbContext, "Youth");

        var ex = await Assert.ThrowsAsync<CommunityPlanLockedException>(
            () => service.SetDefaultFormTemplateAsync(
                community.Id,
                new SetCommunityDefaultFormTemplateRequest(templateId)));

        Assert.Contains("Core plan", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SetDefaultFormTemplateAsync_BasicTenant_CanClearDefault()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Basic);
        var service = CreateCommunityService(dbContext);
        var templateId = await SeedTemplateAsync(dbContext, "Legacy default");
        var community = await SeedCommunityAsync(dbContext, "Youth");
        community.DefaultFormTemplateId = templateId;
        await dbContext.SaveChangesAsync();

        var updated = await service.SetDefaultFormTemplateAsync(
            community.Id,
            new SetCommunityDefaultFormTemplateRequest(null));

        Assert.NotNull(updated);
        Assert.Null(updated!.DefaultFormTemplateId);
        Assert.Null(updated.DefaultFormTemplateName);
    }

    [Fact]
    public async Task SetDefaultFormTemplateAsync_UnknownTemplate_ReturnsNull()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Core);
        var service = CreateCommunityService(dbContext);
        var community = await SeedCommunityAsync(dbContext, "Youth");

        var updated = await service.SetDefaultFormTemplateAsync(
            community.Id,
            new SetCommunityDefaultFormTemplateRequest(Guid.NewGuid()));

        Assert.Null(updated);
    }

    [Fact]
    public async Task SetDefaultFormTemplateAsync_CoreTenantWithProStepsTemplate_ThrowsFormSchemaPlanLocked()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Core);
        var service = CreateCommunityService(dbContext);
        var templateId = await SeedTemplateWithSplitStepsAsync(dbContext, "Pro steps recipe");
        var community = await SeedCommunityAsync(dbContext, "Youth");

        await Assert.ThrowsAsync<FormSchemaPlanLockedException>(
            () => service.SetDefaultFormTemplateAsync(
                community.Id,
                new SetCommunityDefaultFormTemplateRequest(templateId)));
    }

    private static CommunityService CreateCommunityService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TenantId, "test-tenant");
        return new CommunityService(dbContext, currentTenant);
    }

    private static async Task<CohestraDbContext> CreateDbContextAsync(TenantPlan plan)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TenantId, "test-tenant");

        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var dbContext = new CohestraDbContext(options, currentTenant);
        dbContext.Tenants.Add(new Tenant
        {
            Id = TenantId,
            Slug = "test-tenant",
            Name = "Test Tenant",
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await dbContext.SaveChangesAsync();
        return dbContext;
    }

    private static async Task<Community> SeedCommunityAsync(
        CohestraDbContext dbContext,
        string name)
    {
        var now = DateTimeOffset.UtcNow;
        var community = new Community
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Communities.Add(community);
        await dbContext.SaveChangesAsync();
        return community;
    }

    private static async Task<Guid> SeedTemplateAsync(
        CohestraDbContext dbContext,
        string name)
    {
        var now = DateTimeOffset.UtcNow;
        var template = new TenantFormTemplate
        {
            Id = Guid.NewGuid(),
            Name = name,
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "full_name",
                        Type = FormFieldTypes.Text,
                        Label = "Full name",
                        Required = true,
                    },
                ],
            },
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.TenantFormTemplates.Add(template);
        await dbContext.SaveChangesAsync();
        return template.Id;
    }

    private static async Task<Guid> SeedTemplateWithSplitStepsAsync(
        CohestraDbContext dbContext,
        string name)
    {
        var now = DateTimeOffset.UtcNow;
        var template = new TenantFormTemplate
        {
            Id = Guid.NewGuid(),
            Name = name,
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
        };
        dbContext.TenantFormTemplates.Add(template);
        await dbContext.SaveChangesAsync();
        return template.Id;
    }
}
