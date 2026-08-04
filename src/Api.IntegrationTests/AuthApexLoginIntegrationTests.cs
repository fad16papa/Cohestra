using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Auth;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class AuthApexLoginIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Login_on_bare_localhost_with_dev_tenant_slug_returns_handoff_for_other_workspace()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"apex-{Guid.NewGuid():N}"[..16];
        var email = $"apex-admin-{Guid.NewGuid():N}@example.com";
        const string password = "LoadTest123!";

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var membership = scope.ServiceProvider.GetRequiredService<Cohestra.Application.Tenants.ITenantMembershipService>();

            var tenantId = Guid.CreateVersion7();
            var now = DateTimeOffset.UtcNow;
            db.Tenants.Add(new Tenant
            {
                Id = tenantId,
                Slug = slug,
                Name = slug,
                Plan = TenantPlan.Pro,
                Status = TenantStatus.Active,
                BillingStatus = Domain.Billing.BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync();

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
            };
            var createResult = await userManager.CreateAsync(user, password);
            Assert.True(createResult.Succeeded);
            await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
            var membershipResult = await membership.EnsureMembershipAsync(
                user.Id,
                tenantId,
                TenantMembershipRole.TenantAdmin);
            Assert.True(membershipResult.Succeeded);
        }

        using var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Host = "localhost";

        using var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, password),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<AuthLoginHandoffResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal(slug, payload.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(payload.HandoffCode));
        Assert.True(payload.HandoffExpiresInSeconds > 0);
    }
}
