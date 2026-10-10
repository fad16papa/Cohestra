using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Contracts.Site;
using Cohestra.Contracts.PublicDoor;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Outbox;
using Cohestra.Contracts.Activities;
using Cohestra.Contracts.Intelligence;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// SM-1 / AD-10 TenantIsolation gate — cross-tenant negative cases required on every PR to main.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantIsolationApiTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Admin_GetActivity_ByForeignTenantId_Returns404Or403_NeverForeignPayload()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_ISOLATION_ACTIVITY_MARKER";
        var foreignSlug = $"iso-b-{Guid.NewGuid():N}"[..20];
        var foreignActivity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignMarker);

        var ownSlug = $"iso-a-own-{Guid.NewGuid():N}"[..20];
        var ownActivity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, ownSlug);

        using var adminClient = Factory.CreateClient();
        // Default Host (localhost) + default operator JWT = Tenant A (Platform 0).
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        using var ownResponse = await adminClient.GetAsync($"/api/v1/admin/activities/{ownActivity.Id}");
        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);

        using var response = await adminClient.GetAsync($"/api/v1/admin/activities/{foreignActivity.Id}");

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404 or 403 for cross-tenant activity GET, got {(int)response.StatusCode}.");

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignSlug, body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task PublicSite_ForDefaultTenant_DoesNotReturnForeignTenantActivities()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_PUBLIC_SITE_MARKER";
        var foreignSlug = $"iso-pub-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignMarker);

        var visibleSlug = $"iso-a-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, visibleSlug);
        await IntegrationTestHelpers.HideOtherDefaultHomepageActivitiesAsync(Factory.Services, visibleSlug);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);
        await IntegrationTestHelpers.EnsureDefaultSitePublishedAsync(adminClient);

        using var publicClient = Factory.CreateClient();
        using var siteResponse = await publicClient.GetAsync("/api/v1/public/site");
        siteResponse.EnsureSuccessStatusCode();

        var site = await siteResponse.Content.ReadFromJsonAsync<PublicSiteResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(site);
        Assert.Contains(site.UpcomingActivities, activity => activity.Slug == visibleSlug);
        Assert.DoesNotContain(
            site.UpcomingActivities,
            activity =>
                activity.Slug == foreignSlug ||
                activity.Name.Contains(foreignMarker, StringComparison.Ordinal));

        using var activityResponse = await publicClient.GetAsync($"/api/v1/public/activities/{foreignSlug}");
        Assert.Equal(HttpStatusCode.NotFound, activityResponse.StatusCode);
        var activityBody = await activityResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, activityBody, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Admin_ReportExport_ForDefaultTenant_ExcludesForeignTenantMarkers()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var runId = Guid.NewGuid().ToString("N")[..8];
        var tenantB = await CreateForeignTenantAsync();
        var foreignEmail = $"bob-b-{runId}@isolation-b-api.test";
        const string foreignName = "TENANT_B_EXPORT_API_MARKER";
        var foreignSlug = $"iso-exp-{Guid.NewGuid():N}"[..20];
        var foreignRegNumber = $"REGB{runId}";
        var foreignActivity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignName);

        var foreignClient = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.TenantId = tenantB.Id;
                client.FullName = foreignName;
                client.Email = foreignEmail;
                client.NormalizedEmail = foreignEmail;
            });

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantB.Id,
                RegistrationNumber = foreignRegNumber,
                ActivityId = foreignActivity.Id,
                ClientId = foreignClient.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        const string tenantAExportMarker = "TENANT_A_EXPORT_API_MARKER";
        var tenantARegNumber = $"REGA{runId}";
        var tenantAEmail = $"alice-a-{runId}@isolation-a-api.test";
        var tenantAActivity = await IntegrationTestHelpers.SeedPublishedActivityAsync(
            Factory.Services,
            $"iso-a-exp-{Guid.NewGuid():N}"[..20]);
        var tenantAClient = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.TenantId = TenantIds.Default;
                client.FullName = tenantAExportMarker;
                client.Email = tenantAEmail;
                client.NormalizedEmail = tenantAEmail;
            });

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                RegistrationNumber = tenantARegNumber,
                ActivityId = tenantAActivity.Id,
                ClientId = tenantAClient.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        using var exportResponse = await adminClient.GetAsync(
            $"/api/v1/admin/reports/export?preset=custom&from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}");
        exportResponse.EnsureSuccessStatusCode();

        var csv = Encoding.UTF8.GetString(await exportResponse.Content.ReadAsByteArrayAsync());
        Assert.Contains(tenantAExportMarker, csv, StringComparison.Ordinal);
        Assert.Contains(tenantARegNumber, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignName, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignEmail, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignRegNumber, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignSlug, csv, StringComparison.Ordinal);
    }

    private async Task<TenantResponse> CreateForeignTenantAsync(string? name = null)
    {
        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"iso-{Guid.NewGuid():N}"[..12];
        var tenantName = name ?? "Isolation Tenant B";
        return await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            tenantName,
            slug,
            $"admin@{slug}.test");
    }

    [SkippableFact]
    public async Task PublicDoor_OnTenantAHost_DoesNotExposeForeignTenantSlugOrName()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        const string foreignMarker = "TENANT_B_DOOR_ISOLATION_MARKER";
        var tenantB = await CreateForeignTenantAsync(foreignMarker);
        var foreignSlug = tenantB.Slug;
        var foreignActivitySlug = $"iso-door-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignActivitySlug,
            foreignMarker);

        var tenantASlug = $"iso-a-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, tenantASlug);

        using var tenantAClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(tenantAClient, TenantIds.DefaultSlug);

        using var doorResponse = await tenantAClient.GetAsync("/api/v1/public/door");
        doorResponse.EnsureSuccessStatusCode();

        var body = await doorResponse.Content.ReadAsStringAsync();
        var door = JsonSerializer.Deserialize<PublicDoorResponse>(body, IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(door);
        Assert.Equal("active", door.Kind);
        Assert.Equal(TenantIds.DefaultSlug, door.TenantSlug);

        Assert.DoesNotContain(foreignMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignSlug, body, StringComparison.Ordinal);
        Assert.DoesNotContain(tenantB.Name, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(door.StubActivities, activity => activity.Slug == foreignActivitySlug);
        Assert.DoesNotContain(
            door.StubActivities,
            activity => activity.Name.Contains(foreignMarker, StringComparison.Ordinal));
        if (door.Site?.UpcomingActivities is { Count: > 0 } upcoming)
        {
            Assert.DoesNotContain(upcoming, activity => activity.Slug == foreignActivitySlug);
            Assert.DoesNotContain(
                upcoming,
                activity => activity.Name.Contains(foreignMarker, StringComparison.Ordinal));
        }
    }

    [SkippableFact]
    public async Task PublicDoor_CrossTenantActivitySlug_OnTenantAHost_Returns404()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_DOOR_ACTIVITY_MARKER";
        var foreignSlug = $"iso-door-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignMarker);

        using var tenantAClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(tenantAClient, TenantIds.DefaultSlug);

        using var activityResponse = await tenantAClient.GetAsync(
            $"/api/v1/public/activities/{foreignSlug}");
        Assert.Equal(HttpStatusCode.NotFound, activityResponse.StatusCode);

        var activityBody = await activityResponse.Content.ReadAsStringAsync();
        // ProblemDetails.Instance echoes the request path (may include {slug}); assert no tenant payload leaked.
        Assert.DoesNotContain(foreignMarker, activityBody, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Admin_GetFormTemplate_ByForeignTenantId_Returns404Or403_NeverForeignPayload()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_FORM_TEMPLATE_MARKER";
        Guid foreignTemplateId;

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            foreignTemplateId = Guid.NewGuid();
            dbContext.TenantFormTemplates.Add(new TenantFormTemplate
            {
                Id = foreignTemplateId,
                TenantId = tenantB.Id,
                Name = foreignMarker,
                FormSchema = new ActivityFormSchema
                {
                    Version = 1,
                    Fields =
                    [
                        new FormFieldDefinition
                        {
                            Id = "full_name",
                            Type = "text",
                            Label = "Full name",
                            Required = true,
                        },
                    ],
                },
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await dbContext.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        using var response = await adminClient.GetAsync(
            $"/api/v1/admin/form-templates/{foreignTemplateId}");

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404 or 403 for cross-tenant form template GET, got {(int)response.StatusCode}.");

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Admin_SetCommunityDefaultFormTemplate_ForeignTemplate_Returns404()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        Guid foreignTemplateId;

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            foreignTemplateId = Guid.NewGuid();
            dbContext.TenantFormTemplates.Add(new TenantFormTemplate
            {
                Id = foreignTemplateId,
                TenantId = tenantB.Id,
                Name = "Foreign default template",
                FormSchema = new ActivityFormSchema { Version = 1, Fields = [] },
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await dbContext.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var communitiesResponse = await adminClient.GetAsync("/api/v1/admin/communities");
        communitiesResponse.EnsureSuccessStatusCode();
        var communities = await communitiesResponse.Content.ReadFromJsonAsync<CommunityListResponse>(
            IntegrationTestHelpers.JsonOptions);
        var communityId = communities!.Items[0].Id;

        using var response = await adminClient.PutAsJsonAsync(
            $"/api/v1/admin/communities/{communityId}/default-form-template",
            new SetCommunityDefaultFormTemplateRequest(foreignTemplateId));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task Admin_DuplicateFormTemplate_ForeignTemplate_Returns404()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        Guid foreignTemplateId;

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            foreignTemplateId = Guid.NewGuid();
            dbContext.TenantFormTemplates.Add(new TenantFormTemplate
            {
                Id = foreignTemplateId,
                TenantId = tenantB.Id,
                Name = "Foreign duplicate source",
                FormSchema = new ActivityFormSchema { Version = 1, Fields = [] },
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await dbContext.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        using var response = await adminClient.PostAsJsonAsync(
            $"/api/v1/admin/form-templates/{foreignTemplateId}/duplicate",
            new DuplicateFormTemplateRequest(null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task Admin_IntelligenceBrief_ExcludesForeignTenantNames()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_BRIEF_API_MARKER";
        await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.TenantId = tenantB.Id;
                client.FullName = foreignMarker;
                client.LeadStatus = LeadStatus.Active;
                client.NextFollowUpAt = DateTimeOffset.UtcNow.AddHours(-1);
            });

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        using var response = await adminClient.GetAsync("/api/v1/admin/intelligence/brief");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, body, StringComparison.Ordinal);

        var brief = await response.Content.ReadFromJsonAsync<IntelligenceBriefResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(brief);
        Assert.DoesNotContain(
            brief!.Insights.SelectMany(insight => insight.Evidence),
            evidence => evidence.Value.Contains(foreignMarker, StringComparison.Ordinal));
    }

    [SkippableFact]
    public async Task Platform_overview_is_PlatformAdmin_only_and_returns_aggregates_without_secrets()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var tenantAdmin = Factory.CreateClient();
        var tenantToken = await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin);
        IntegrationTestHelpers.UseBearerToken(tenantAdmin, tenantToken);
        using var forbidden = await tenantAdmin.GetAsync("/api/v1/platform/ops/overview");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);

        var secretSlug = $"ovsec-{Guid.NewGuid():N}"[..12];
        await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Overview Secret Org",
            secretSlug,
            $"admin-{secretSlug}@overview-secret.test");

        using var ok = await platform.GetAsync("/api/v1/platform/ops/overview");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var body = await ok.Content.ReadAsStringAsync();
        Assert.DoesNotContain(secretSlug, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("@overview-secret.test", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("redis://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rediss://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Bearer ", body, StringComparison.Ordinal);
        Assert.DoesNotContain("eyJ", body, StringComparison.Ordinal);

        var overview = JsonSerializer.Deserialize<PlatformOpsOverviewResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(overview);
        Assert.Equal(PlatformKpiFreshness.Actual, overview.StackHealth.Freshness);
        Assert.Contains(
            overview.StackHealth.Value,
            new[]
            {
                PlatformHealthStatuses.Healthy,
                PlatformHealthStatuses.Degraded,
                PlatformHealthStatuses.Unhealthy,
            });
    }

    [SkippableFact]
    public async Task Platform_ops_health_is_PlatformAdmin_only_and_contains_no_secrets()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var tenantAdmin = Factory.CreateClient();
        var tenantToken = await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin);
        IntegrationTestHelpers.UseBearerToken(tenantAdmin, tenantToken);
        using var forbidden = await tenantAdmin.GetAsync("/api/v1/platform/ops/health");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);
        using var ok = await platform.GetAsync("/api/v1/platform/ops/health");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var body = await ok.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Host=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Username=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("redis://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rediss://", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Bearer ", body, StringComparison.Ordinal);
        Assert.DoesNotContain("ApiKey", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("StackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("eyJ", body, StringComparison.Ordinal);

        var health = JsonSerializer.Deserialize<PlatformOpsHealthResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(health);
        Assert.Contains(health.Checks, check => check.Name == "postgres");
        Assert.Contains(health.Checks, check => check.Name == "redis");
        Assert.Contains(health.Checks, check => check.Name == "default-tenant");
        Assert.All(
            health.NotInProbe,
            check => Assert.Equal(PlatformHealthStatuses.NotInProbe, check.Status));
    }

    [SkippableFact]
    public async Task Platform_ops_outbox_tenantId_filter_returns_only_requested_tenant()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        var tenantAId = TenantIds.Default;
        var markerA = $"TENANT_A_OUTBOX_{Guid.NewGuid():N}";
        var markerB = $"TENANT_B_OUTBOX_{Guid.NewGuid():N}";

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.OutboxMessages.AddRange(
                new OutboxMessage
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantAId,
                    MessageType = OutboxMessageTypes.CampaignRecipient,
                    PayloadJson = $"{{\"marker\":\"{markerA}\"}}",
                    Status = OutboxMessageStatus.Failed,
                    AttemptCount = 3,
                    CreatedAt = DateTimeOffset.UtcNow,
                    NextAttemptAt = DateTimeOffset.UtcNow,
                },
                new OutboxMessage
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantB.Id,
                    MessageType = OutboxMessageTypes.CampaignRecipient,
                    PayloadJson = $"{{\"marker\":\"{markerB}\"}}",
                    Status = OutboxMessageStatus.Failed,
                    AttemptCount = 3,
                    CreatedAt = DateTimeOffset.UtcNow,
                    NextAttemptAt = DateTimeOffset.UtcNow,
                });
            await db.SaveChangesAsync();
        }

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            tenantAdmin,
            await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var forbiddenSummary = await tenantAdmin.GetAsync("/api/v1/platform/ops/outbox/summary");
        using var forbiddenList = await tenantAdmin.GetAsync($"/api/v1/platform/ops/outbox?tenantId={tenantAId}");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenSummary.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenList.StatusCode);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            platform,
            await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        using var filtered = await platform.GetAsync(
            $"/api/v1/platform/ops/outbox?tenantId={tenantAId}&status=Failed&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, filtered.StatusCode);
        var body = await filtered.Content.ReadAsStringAsync();
        Assert.DoesNotContain(markerB, body, StringComparison.Ordinal);
        Assert.DoesNotContain(tenantB.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("payloadJson", body, StringComparison.OrdinalIgnoreCase);

        var list = JsonSerializer.Deserialize<PlatformOpsOutboxListResponse>(body, IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Contains(list.Items, item => item.TenantId == tenantAId);
        Assert.DoesNotContain(list.Items, item => item.TenantId == tenantB.Id);
    }

    [SkippableFact]
    public async Task Platform_ops_paddle_deliveries_tenantId_filter_returns_only_requested_tenant()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        var tenantAId = TenantIds.Default;
        var eventA = $"evt_a_{Guid.NewGuid():N}";
        var eventB = $"evt_b_{Guid.NewGuid():N}";

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.PaddleWebhookDeliveries.AddRange(
                new PaddleWebhookDelivery
                {
                    Id = Guid.CreateVersion7(),
                    EventId = eventA,
                    EventType = "transaction.completed",
                    Disposition = PaddleWebhookDeliveryDisposition.Processed,
                    TenantId = tenantAId,
                    HttpStatus = 200,
                    DetailSanitized = "Processed.",
                    ObservedAt = DateTimeOffset.UtcNow,
                },
                new PaddleWebhookDelivery
                {
                    Id = Guid.CreateVersion7(),
                    EventId = eventB,
                    EventType = "transaction.completed",
                    Disposition = PaddleWebhookDeliveryDisposition.Processed,
                    TenantId = tenantB.Id,
                    HttpStatus = 200,
                    DetailSanitized = "Processed.",
                    ObservedAt = DateTimeOffset.UtcNow,
                });
            await db.SaveChangesAsync();
        }

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            tenantAdmin,
            await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var forbiddenConfig = await tenantAdmin.GetAsync("/api/v1/platform/ops/paddle/config");
        using var forbiddenList = await tenantAdmin.GetAsync(
            $"/api/v1/platform/ops/paddle/deliveries?tenantId={tenantAId}");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenConfig.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenList.StatusCode);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            platform,
            await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        using var filtered = await platform.GetAsync(
            $"/api/v1/platform/ops/paddle/deliveries?tenantId={tenantAId}&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, filtered.StatusCode);
        var body = await filtered.Content.ReadAsStringAsync();
        Assert.DoesNotContain(eventB, body, StringComparison.Ordinal);
        Assert.DoesNotContain(tenantB.Id.ToString(), body, StringComparison.OrdinalIgnoreCase);

        var list = JsonSerializer.Deserialize<PlatformOpsPaddleDeliveryListResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Contains(list.Items, item => item.TenantId == tenantAId && item.EventId == eventA);
        Assert.DoesNotContain(list.Items, item => item.TenantId == tenantB.Id);
    }

    [SkippableFact]
    public async Task Platform_tenant_timeline_returns_only_requested_tenant()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        var tenantAId = TenantIds.Default;
        const string markerA = "TENANT_A_TIMELINE_44_6";
        const string markerB = "TENANT_B_TIMELINE_44_6";
        const string auditSecret = "AUDIT_DETAILS_SECRET_44_6";
        const string outboxSecret = "OUTBOX_PAYLOAD_SECRET_44_6";
        const string supportSecret = "SUPPORT_BODY_SECRET_44_6";
        const string paddleSecret = "PADDLE_SECRET_44_6";
        var now = DateTimeOffset.UtcNow;

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.PlatformAuditLogs.AddRange(
                new PlatformAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    ActorUserId = Guid.CreateVersion7(),
                    TenantId = tenantAId,
                    Action = PlatformAuditAction.TenantCreated,
                    Reason = markerA,
                    DetailsJson = auditSecret,
                    CreatedAt = now,
                },
                new PlatformAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    ActorUserId = Guid.CreateVersion7(),
                    TenantId = tenantB.Id,
                    Action = PlatformAuditAction.TenantCreated,
                    Reason = markerB,
                    DetailsJson = auditSecret,
                    CreatedAt = now,
                });
            db.SupportIssues.AddRange(
                new SupportIssue
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantAId,
                    IssueNumber = "SUP-ISO-A",
                    SubmittedByUserId = Guid.CreateVersion7(),
                    Subject = supportSecret,
                    Description = supportSecret,
                    OperatorEmail = "a@example.com",
                    OperatorDisplayName = "A",
                    TenantSlug = "default",
                    TenantName = "Default",
                    CreatedAt = now,
                    UpdatedAt = now,
                },
                new SupportIssue
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantB.Id,
                    IssueNumber = "SUP-ISO-B",
                    SubmittedByUserId = Guid.CreateVersion7(),
                    Subject = supportSecret,
                    Description = supportSecret,
                    OperatorEmail = "b@example.com",
                    OperatorDisplayName = "B",
                    TenantSlug = tenantB.Slug,
                    TenantName = tenantB.Name,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            db.OutboxMessages.AddRange(
                new OutboxMessage
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantAId,
                    MessageType = OutboxMessageTypes.CampaignRecipient,
                    PayloadJson = $"{{\"marker\":\"{outboxSecret}\"}}",
                    Status = OutboxMessageStatus.Failed,
                    CreatedAt = now,
                    NextAttemptAt = now,
                    LastError = outboxSecret,
                },
                new OutboxMessage
                {
                    Id = Guid.CreateVersion7(),
                    TenantId = tenantB.Id,
                    MessageType = OutboxMessageTypes.CampaignRecipient,
                    PayloadJson = $"{{\"marker\":\"{outboxSecret}\"}}",
                    Status = OutboxMessageStatus.Failed,
                    CreatedAt = now,
                    NextAttemptAt = now,
                    LastError = outboxSecret,
                });
            db.PaddleWebhookDeliveries.AddRange(
                new PaddleWebhookDelivery
                {
                    Id = Guid.CreateVersion7(),
                    EventId = "evt-iso-a",
                    EventType = "transaction.completed",
                    Disposition = PaddleWebhookDeliveryDisposition.Processed,
                    TenantId = tenantAId,
                    HttpStatus = 200,
                    DetailSanitized = "Processed.",
                    ObservedAt = now,
                },
                new PaddleWebhookDelivery
                {
                    Id = Guid.CreateVersion7(),
                    EventId = "evt-iso-b",
                    EventType = "transaction.completed",
                    Disposition = PaddleWebhookDeliveryDisposition.Processed,
                    TenantId = tenantB.Id,
                    HttpStatus = 200,
                    DetailSanitized = paddleSecret,
                    ObservedAt = now,
                },
                new PaddleWebhookDelivery
                {
                    Id = Guid.CreateVersion7(),
                    EventId = "evt-iso-null",
                    EventType = "transaction.completed",
                    Disposition = PaddleWebhookDeliveryDisposition.Rejected,
                    TenantId = null,
                    HttpStatus = 400,
                    DetailSanitized = paddleSecret,
                    ObservedAt = now,
                });
            await db.SaveChangesAsync();
        }

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            tenantAdmin,
            await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var forbidden = await tenantAdmin.GetAsync($"/api/v1/platform/tenants/{tenantAId}/timeline");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            platform,
            await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));

        using var forA = await platform.GetAsync($"/api/v1/platform/tenants/{tenantAId}/timeline");
        Assert.Equal(HttpStatusCode.OK, forA.StatusCode);
        var bodyA = await forA.Content.ReadAsStringAsync();
        Assert.DoesNotContain(markerB, bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(tenantB.Id.ToString(), bodyA, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SUP-ISO-B", bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain("evt-iso-b", bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain("evt-iso-null", bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(auditSecret, bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(outboxSecret, bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(supportSecret, bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(paddleSecret, bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain("payloadJson", bodyA, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("detailsJson", bodyA, StringComparison.OrdinalIgnoreCase);

        var timelineA = JsonSerializer.Deserialize<PlatformTenantTimelineResponse>(
            bodyA,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(timelineA);
        Assert.Equal(tenantAId, timelineA.TenantId);
        Assert.DoesNotContain(timelineA.Items, item => item.Summary.Contains(markerB, StringComparison.Ordinal));

        using var forB = await platform.GetAsync($"/api/v1/platform/tenants/{tenantB.Id}/timeline");
        Assert.Equal(HttpStatusCode.OK, forB.StatusCode);
        var bodyB = await forB.Content.ReadAsStringAsync();
        Assert.DoesNotContain(markerA, bodyB, StringComparison.Ordinal);
        Assert.DoesNotContain("SUP-ISO-A", bodyB, StringComparison.Ordinal);
        Assert.DoesNotContain("evt-iso-a", bodyB, StringComparison.Ordinal);
        var timelineB = JsonSerializer.Deserialize<PlatformTenantTimelineResponse>(
            bodyB,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(timelineB);
        Assert.Equal(tenantB.Id, timelineB.TenantId);
        Assert.DoesNotContain(timelineB.Items, item => item.Summary.Contains(markerA, StringComparison.Ordinal));
    }
}
