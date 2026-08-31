using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Site;
using Cohestra.Contracts.WebsiteInquiries;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class WebsiteInquiryIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitWebsiteInquiry_CreatesClientAndTimelineEvent_NoRegistration()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"contact-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await PublishSiteWithContactSectionAsync(slug);

        var email = $"contact-{Guid.NewGuid():N}@example.com";

        using var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/public/website-inquiries",
            new SubmitWebsiteInquiryRequest(
                Name: "Jordan Lee",
                Email: email,
                Phone: "91234567",
                Message: "I'd like to hear about upcoming events.",
                ConsentGiven: true),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<SubmitWebsiteInquiryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.Equal("created", body.Status);
        Assert.NotEqual(Guid.Empty, body.ClientId);
        Assert.True(body.ClientCreated);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        Assert.Equal(0, dbContext.Registrations.Count(item => item.ClientId == body.ClientId));

        var savedClient = await dbContext.Clients
            .FirstOrDefaultAsync(item => item.Id == body.ClientId);
        Assert.NotNull(savedClient);
        Assert.True(savedClient.ConsentGiven);

        Assert.True(await dbContext.ClientTimelineEvents.AnyAsync(item =>
            item.ClientId == body.ClientId &&
            item.EventType == ClientTimelineEventType.WebsiteInquiry));

        Assert.True(await dbContext.OutboxMessages.AnyAsync(item =>
            item.MessageType == OutboxMessageTypes.WebsiteInquiryOperatorNotify));
    }

    [SkippableFact]
    public async Task SubmitWebsiteInquiry_DuplicateEmail_UpdatesExistingClient()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"contact-dedup-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await PublishSiteWithContactSectionAsync(slug);

        var email = $"dedup-{Guid.NewGuid():N}@example.com";

        using var client = Factory.CreateClient();

        var first = await client.PostAsJsonAsync(
            "/api/v1/public/website-inquiries",
            new SubmitWebsiteInquiryRequest("First Name", email, null, "First message", false),
            IntegrationTestHelpers.JsonOptions);
        first.EnsureSuccessStatusCode();
        var firstBody = await first.Content.ReadFromJsonAsync<SubmitWebsiteInquiryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(firstBody);
        Assert.True(firstBody.ClientCreated);

        var second = await client.PostAsJsonAsync(
            "/api/v1/public/website-inquiries",
            new SubmitWebsiteInquiryRequest("Updated Name", email, null, "Second message", false),
            IntegrationTestHelpers.JsonOptions);
        second.EnsureSuccessStatusCode();
        var secondBody = await second.Content.ReadFromJsonAsync<SubmitWebsiteInquiryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(secondBody);
        Assert.Equal("updated", secondBody.Status);
        Assert.False(secondBody.ClientCreated);
        Assert.Equal(firstBody.ClientId, secondBody.ClientId);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        var savedClient = await dbContext.Clients.FirstOrDefaultAsync(item => item.Id == firstBody.ClientId);
        Assert.NotNull(savedClient);
        Assert.False(savedClient.ConsentGiven);

        Assert.Equal(1, dbContext.Clients.Count(item => item.NormalizedEmail == email.ToLowerInvariant()));
        Assert.Equal(2, dbContext.ClientTimelineEvents.Count(item => item.ClientId == firstBody.ClientId));
    }

    [SkippableFact]
    public async Task SubmitWebsiteInquiry_WithoutPublishedContactSection_Returns404()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"contact-none-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await PublishSiteWithoutContactSectionAsync(slug);

        using var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/public/website-inquiries",
            new SubmitWebsiteInquiryRequest(
                "Alex",
                "alex@example.com",
                null,
                "Hello",
                false),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task SubmitWebsiteInquiry_BasicTenant_ReturnsPlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"contact-basic-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await PublishSiteWithContactSectionAsync(slug);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await dbContext.Tenants.FirstAsync(item => item.Id == TenantIds.Default);
        var originalPlan = tenant.Plan;
        tenant.Plan = TenantPlan.Basic;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync();

        try
        {
            using var client = Factory.CreateClient();
            var response = await client.PostAsJsonAsync(
                "/api/v1/public/website-inquiries",
                new SubmitWebsiteInquiryRequest(
                    "Alex",
                    "alex@example.com",
                    null,
                    "Hello",
                    false),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            var errorCode = await IntegrationTestHelpers.ReadProblemErrorCodeAsync(response);
            Assert.Equal("plan_locked", errorCode);
        }
        finally
        {
            tenant.Plan = originalPlan;
            tenant.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync();
        }
    }

    private async Task PublishSiteWithoutContactSectionAsync(string activitySlug)
    {
        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var draft = CreateDraftWithoutContactSection(activitySlug);
        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await adminClient.PostAsync("/api/v1/admin/site/publish", content: null);
        publishResponse.EnsureSuccessStatusCode();
    }

    private async Task PublishSiteWithContactSectionAsync(string activitySlug)
    {
        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var draft = CreateDraftWithContactSection(activitySlug);
        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await adminClient.PostAsync("/api/v1/admin/site/publish", content: null);
        publishResponse.EnsureSuccessStatusCode();
    }

    private static SiteSectionsDocumentDto CreateDraftWithoutContactSection(string activitySlug)
    {
        using var heroProps = System.Text.Json.JsonDocument.Parse(
            $$"""
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, heroProps.RootElement),
            ]);
    }

    private static SiteSectionsDocumentDto CreateDraftWithContactSection(string activitySlug)
    {
        using var heroProps = System.Text.Json.JsonDocument.Parse(
            $$"""
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);
        using var contactProps = System.Text.Json.JsonDocument.Parse(
            """
            {
              "heading": "Get in touch",
              "intro": "Send us a message.",
              "buttonLabel": "Send message",
              "successMessage": "Thanks — we received your message.",
              "consentLabel": "Keep me updated about events."
            }
            """);

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, heroProps.RootElement),
                new SiteSectionDto("contact-1", "contact", true, 1, contactProps.RootElement),
            ]);
    }
}
