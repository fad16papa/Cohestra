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
public sealed class AuthVerifyEmailIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task VerifyEmail_confirmed_account_returns_400_without_tokens()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"verify-{Guid.NewGuid():N}"[..16];
        var email = $"verified-{Guid.NewGuid():N}@example.com";
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
                Plan = TenantPlan.Basic,
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
            Assert.True((await userManager.CreateAsync(user, password)).Succeeded);
            Assert.True((await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole)).Succeeded);
            Assert.True((await membership.EnsureMembershipAsync(
                user.Id,
                tenantId,
                TenantMembershipRole.TenantAdmin)).Succeeded);
        }

        using var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Host = $"{slug}.localhost";

        using var rejected = await client.PostAsJsonAsync(
            "/api/v1/auth/verify-email",
            new VerifyEmailOtpRequest(email, "000000"),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        var rejectedBody = await rejected.Content.ReadAsStringAsync();
        Assert.Contains("already verified", rejectedBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("accessToken", rejectedBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("refreshToken", rejectedBody, StringComparison.OrdinalIgnoreCase);

        using var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, password),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }
}
