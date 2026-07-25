using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Signup;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicSignupIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Signup_slug_check_returns_suggestions_for_taken_slug()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"taken-{Guid.NewGuid():N}"[..20];
        await CreateTenantAsync(slug);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync($"/api/v1/public/signup/slug-check?slug={slug}");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<SlugAvailabilityResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(payload);
        Assert.False(payload.Available);
        Assert.NotEmpty(payload.Suggestions);
    }

    [SkippableFact]
    public async Task Signup_post_creates_basic_tenant_and_requires_verify()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"signup-{Guid.NewGuid():N}"[..20];
        var email = $"signup-{Guid.NewGuid():N}@example.com";

        using var client = Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Test Atelier",
                Slug: slug,
                Email: email,
                Password: "ChangeMe123!",
                CaptchaToken: "test-captcha-pass"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<PublicSignupResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(payload);
        Assert.Equal(slug, payload.TenantSlug);
        Assert.Equal(email, payload.Email);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = db.Tenants.Single(t => t.Slug == slug);
        Assert.Equal("Basic", tenant.Plan.ToString());
        Assert.Equal("Free", tenant.BillingStatus.ToString());
        Assert.NotNull(tenant.LegalAcceptedAt);
        Assert.Equal("2026-07-21", tenant.TermsVersion);
        Assert.False(await db.SitePages.AsQueryable().AnyAsync(sp => sp.TenantId == tenant.Id));
    }

    private async Task CreateTenantAsync(string slug)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        db.Tenants.Add(new Domain.Tenants.Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = slug,
            Name = slug,
            Plan = Domain.Tenants.TenantPlan.Basic,
            Status = Domain.Tenants.TenantStatus.Active,
            BillingStatus = Domain.Billing.BillingStatus.Free,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
