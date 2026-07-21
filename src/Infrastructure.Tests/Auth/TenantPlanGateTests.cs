using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class TenantPlanGateTests
{
    [Theory]
    [InlineData(TenantPlan.Basic, false)]
    [InlineData(TenantPlan.Core, false)]
    [InlineData(TenantPlan.Pro, true)]
    [InlineData(TenantPlan.Enterprise, true)]
    public async Task EvaluateCampaigns_respects_plan(TenantPlan plan, bool allowed)
    {
        await using var db = CreateDb();
        var tenantId = Guid.CreateVersion7();
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = $"t-{tenantId:N}"[..12],
            Name = "Plan Gate Tenant",
            Plan = plan,
            Status = TenantStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var gate = new TenantPlanGate(db);
        var result = await gate.EvaluateCampaignsAsync(tenantId);

        Assert.Equal(allowed, result.Allowed);
        if (!allowed)
        {
            Assert.Equal("plan_locked", result.ErrorCode);
        }
    }

    [Fact]
    public async Task EvaluateCampaigns_missing_tenant_is_locked()
    {
        await using var db = CreateDb();
        var gate = new TenantPlanGate(db);

        var result = await gate.EvaluateCampaignsAsync(Guid.CreateVersion7());

        Assert.False(result.Allowed);
        Assert.Equal("plan_locked", result.ErrorCode);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
