using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormTemplateServiceTests
{
    private static readonly Guid TenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public async Task CreateAsync_StoresSchemaSnapshotAndListsTemplate()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Basic);
        var service = CreateService(dbContext);
        var request = CreateRequest("Saturday tennis");

        var created = await service.CreateAsync(request);
        var list = await service.ListAsync();

        Assert.Equal("Saturday tennis", created.Name);
        Assert.Equal(1, created.FormSchema.Fields.Count);
        Assert.Equal("full_name", created.FormSchema.Fields[0].Id);
        Assert.Single(list.Templates);
        Assert.Equal(1, list.Usage.Used);
        Assert.Equal(1, list.Usage.Limit);
    }

    [Fact]
    public async Task UpdateAsync_RenamesTemplate()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Pro);
        var service = CreateService(dbContext);
        var created = await service.CreateAsync(CreateRequest("Original name"));

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateFormTemplateRequest("Renamed", null));

        Assert.NotNull(updated);
        Assert.Equal("Renamed", updated!.Name);
    }

    [Fact]
    public async Task DeleteAsync_RemovesTemplate()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Pro);
        var service = CreateService(dbContext);
        var created = await service.CreateAsync(CreateRequest("Delete me"));

        var deleted = await service.DeleteAsync(created.Id);
        var list = await service.ListAsync();

        Assert.True(deleted);
        Assert.Empty(list.Templates);
        Assert.Equal(0, list.Usage.Used);
    }

    [Fact]
    public async Task CreateAsync_BasicSecondTemplate_ThrowsPlanLocked()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Basic);
        var service = CreateService(dbContext);
        await service.CreateAsync(CreateRequest("First"));

        var ex = await Assert.ThrowsAsync<FormTemplatePlanLockedException>(
            () => service.CreateAsync(CreateRequest("Second")));

        Assert.Contains("Core saves up to 5 form recipes", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_CoreSixthTemplate_ThrowsPlanLocked()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Core);
        var service = CreateService(dbContext);

        for (var index = 0; index < 5; index++)
        {
            await service.CreateAsync(CreateRequest($"Template {index + 1}"));
        }

        var ex = await Assert.ThrowsAsync<FormTemplatePlanLockedException>(
            () => service.CreateAsync(CreateRequest("Template 6")));

        Assert.Contains("Pro saves up to 25 form recipes", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_ProTwentySixthTemplate_ThrowsPlanLocked()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Pro);
        var service = CreateService(dbContext);

        for (var index = 0; index < 25; index++)
        {
            await service.CreateAsync(CreateRequest($"Template {index + 1}"));
        }

        var ex = await Assert.ThrowsAsync<FormTemplatePlanLockedException>(
            () => service.CreateAsync(CreateRequest("Template 26")));

        Assert.Contains("at capacity", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesFormSchema()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Pro);
        var service = CreateService(dbContext);
        var created = await service.CreateAsync(CreateRequest("Original"));

        var replacement = new ActivityFormSchemaDto(
            1,
            [
                new FormFieldDefinitionDto(
                    "email",
                    "email",
                    "Email",
                    true,
                    null,
                    null,
                    null,
                    null),
            ]);

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateFormTemplateRequest(null, replacement));

        Assert.NotNull(updated);
        Assert.Single(updated!.FormSchema.Fields);
        Assert.Equal("email", updated.FormSchema.Fields[0].Id);
    }

    [Fact]
    public async Task ListAsync_AfterDowngradeOverCap_StillReturnsExistingTemplates()
    {
        await using var dbContext = await CreateDbContextAsync(TenantPlan.Pro);
        var service = CreateService(dbContext);

        for (var index = 0; index < 3; index++)
        {
            await service.CreateAsync(CreateRequest($"Template {index + 1}"));
        }

        var tenant = await dbContext.Tenants.FirstAsync();
        tenant.Plan = TenantPlan.Basic;
        await dbContext.SaveChangesAsync();

        var list = await service.ListAsync();

        Assert.Equal(3, list.Templates.Count);
        Assert.Equal(3, list.Usage.Used);
        Assert.Equal(1, list.Usage.Limit);

        await Assert.ThrowsAsync<FormTemplatePlanLockedException>(
            () => service.CreateAsync(CreateRequest("Blocked")));
    }

    private static FormTemplateService CreateService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TenantId, "test-tenant");
        return new FormTemplateService(dbContext, currentTenant);
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

    private static CreateFormTemplateRequest CreateRequest(string name) =>
        new(
            name,
            new ActivityFormSchemaDto(
                1,
                [
                    new FormFieldDefinitionDto(
                        "full_name",
                        "text",
                        "Full name",
                        true,
                        null,
                        null,
                        null,
                        null),
                ]));
}
