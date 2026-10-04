using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// Same-entitlement Pro-to-Pro isolation for Campaigns. A Basic JWT is not sufficient
/// because <c>RequireProPlan</c> can reject before tenant lookup.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class CampaignIsolationIntegrationTests(IntegrationTestFixture fixture)
{
    private const string SubjectMarker = "TENANT_A_CAMPAIGN_SUBJECT_MARKER";
    private const string BodyMarker = "TENANT_A_CAMPAIGN_BODY_MARKER";
    private const string RecipientNameMarker = "TENANT_A_RECIPIENT_NAME_MARKER";
    private const string RecipientEmailMarker = "ada-a-isolation@tenant-a.test";
    private const string TemplateNameMarker = "TENANT_A_TEMPLATE_NAME_MARKER";
    private const string ActivityNameMarker = "TENANT_A_ACTIVITY_QR_MARKER";
    private const string AssetFileMarker = "tenant-a-isolation-asset.png";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task ProTenantB_CannotReadOrReuse_ProTenantA_CampaignResources()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantA = await CreateProTenantAsync("Campaign Isolation A");
        var tenantB = await CreateProTenantAsync("Campaign Isolation B");

        var activityA = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantA.Id,
            $"iso-a-{Guid.NewGuid():N}"[..20],
            ActivityNameMarker);

        var seeded = await SeedTenantACampaignAsync(tenantA.Id, activityA.Id);

        using var tenantAClient = await CreateProOperatorClientAsync(tenantA);
        using var ownCampaign = await tenantAClient.GetAsync($"/api/v1/admin/campaigns/{seeded.CampaignId}");
        Assert.Equal(HttpStatusCode.OK, ownCampaign.StatusCode);
        var ownBody = await ownCampaign.Content.ReadAsStringAsync();
        Assert.Contains(SubjectMarker, ownBody, StringComparison.Ordinal);
        Assert.Contains(RecipientEmailMarker, ownBody, StringComparison.Ordinal);

        using var tenantBClient = await CreateProOperatorClientAsync(tenantB);

        using var detail = await tenantBClient.GetAsync($"/api/v1/admin/campaigns/{seeded.CampaignId}");
        await AssertDeniedWithoutLeakAsync(detail, "campaign detail");

        using var list = await tenantBClient.GetAsync("/api/v1/admin/campaigns?page=1&pageSize=25");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        await AssertNoLeakAsync(await list.Content.ReadAsStringAsync(), "campaign list");

        using var templateGet = await tenantBClient.GetAsync(
            $"/api/v1/admin/email-templates/{seeded.TemplateId}");
        await AssertDeniedWithoutLeakAsync(templateGet, "email template");

        using var templateList = await tenantBClient.GetAsync("/api/v1/admin/email-templates");
        Assert.Equal(HttpStatusCode.OK, templateList.StatusCode);
        await AssertNoLeakAsync(await templateList.Content.ReadAsStringAsync(), "email template list");

        using var templatePatch = await tenantBClient.PatchAsJsonAsync(
            $"/api/v1/admin/email-templates/{seeded.TemplateId}",
            new UpdateEmailTemplateRequest("stolen", "stolen", "stolen"),
            IntegrationTestHelpers.JsonOptions);
        await AssertDeniedWithoutLeakAsync(templatePatch, "email template patch");

        using var preview = await tenantBClient.PostAsJsonAsync(
            "/api/v1/admin/campaigns/segment/preview",
            new ClientSegmentQueryRequest(
                ActivityIds: [activityA.Id],
                LeadStatus: null,
                Community: activityA.CommunityLabel,
                ClientIds: [seeded.ClientId],
                Name: null,
                Nationality: null,
                Profession: null,
                ConsentOnly: true,
                AllClients: false,
                AdditionalClientIds: [seeded.ClientId]),
            IntegrationTestHelpers.JsonOptions);
        Assert.True(
            preview.StatusCode is HttpStatusCode.OK or HttpStatusCode.BadRequest,
            $"Expected 200 or 400 for cross-tenant preview, got {(int)preview.StatusCode}.");
        var previewBody = await preview.Content.ReadAsStringAsync();
        await AssertNoLeakAsync(previewBody, "segment preview");
        if (preview.StatusCode == HttpStatusCode.OK)
        {
            var previewPayload = System.Text.Json.JsonSerializer.Deserialize<ClientSegmentPreviewResponse>(
                previewBody,
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(previewPayload);
            Assert.Equal(0, previewPayload.TotalCount);
            Assert.Equal(0, previewPayload.WithEmailCount);
            Assert.DoesNotContain(
                previewPayload.PreviewItems,
                item => item.Id == seeded.ClientId ||
                        item.Email == RecipientEmailMarker ||
                        item.FullName.Contains(RecipientNameMarker, StringComparison.Ordinal));
        }

        using var sendWithForeignClients = await tenantBClient.PostAsJsonAsync(
            "/api/v1/admin/campaigns/send",
            new SendCampaignRequest(
                Subject: "Tenant B must not reuse Tenant A clients",
                Body: "Isolation send probe",
                EmailTemplateId: null,
                Segment: new ClientSegmentQueryRequest(
                    ActivityIds: [activityA.Id],
                    LeadStatus: null,
                    Community: activityA.CommunityLabel,
                    ClientIds: [seeded.ClientId],
                    AllClients: false)),
            IntegrationTestHelpers.JsonOptions);
        Assert.True(
            sendWithForeignClients.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 400/403/404 for cross-tenant send, got {(int)sendWithForeignClients.StatusCode}.");
        await AssertNoLeakAsync(
            await sendWithForeignClients.Content.ReadAsStringAsync(),
            "send with foreign clients");

        using var sendWithForeignTemplate = await tenantBClient.PostAsJsonAsync(
            "/api/v1/admin/campaigns/send",
            new SendCampaignRequest(
                Subject: "Tenant B must not reuse Tenant A template",
                Body: "Isolation template probe",
                EmailTemplateId: seeded.TemplateId,
                Segment: new ClientSegmentQueryRequest(
                    ActivityIds: null,
                    LeadStatus: null,
                    Community: null,
                    ClientIds: [seeded.ClientId],
                    AllClients: false)),
            IntegrationTestHelpers.JsonOptions);
        Assert.True(
            sendWithForeignTemplate.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 400/403/404 for foreign template send, got {(int)sendWithForeignTemplate.StatusCode}.");
        await AssertNoLeakAsync(
            await sendWithForeignTemplate.Content.ReadAsStringAsync(),
            "send with foreign template");

        using var qr = await tenantBClient.PostAsJsonAsync(
            "/api/v1/admin/campaigns/assets/from-activity-qr",
            new CreateCampaignAssetFromQrRequest(activityA.Id, "stolen QR"),
            IntegrationTestHelpers.JsonOptions);
        Assert.True(
            qr.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 400/403/404 for foreign QR, got {(int)qr.StatusCode}.");
        await AssertNoLeakAsync(await qr.Content.ReadAsStringAsync(), "QR from foreign activity");

        using var publicAsset = await tenantBClient.GetAsync(
            $"/api/v1/public/campaign-assets/{seeded.AssetId}");
        Assert.True(
            publicAsset.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404 or 403 for foreign public asset, got {(int)publicAsset.StatusCode}.");
        await AssertNoLeakAsync(await publicAsset.Content.ReadAsStringAsync(), "public campaign asset");
    }

    private async Task<(Guid CampaignId, Guid TemplateId, Guid ClientId, Guid AssetId)> SeedTenantACampaignAsync(
        Guid tenantAId,
        Guid activityId)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IOptions<CampaignAssetOptions>>().Value;
        var now = DateTimeOffset.UtcNow;

        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantAId,
            FullName = RecipientNameMarker,
            Email = RecipientEmailMarker,
            NormalizedEmail = RecipientEmailMarker,
            ConsentGiven = true,
            LeadStatus = LeadStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Clients.Add(client);

        var template = new EmailTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantAId,
            Name = TemplateNameMarker,
            Subject = SubjectMarker,
            Body = BodyMarker,
            BodyFormat = CampaignBodyFormat.Plain,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.EmailTemplates.Add(template);

        var assetId = Guid.NewGuid();
        Directory.CreateDirectory(storage.StoragePath);
        var relativePath = $"{assetId:N}.png";
        await File.WriteAllBytesAsync(
            Path.Combine(storage.StoragePath, relativePath),
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        db.CampaignAssets.Add(new CampaignAsset
        {
            Id = assetId,
            TenantId = tenantAId,
            FileName = AssetFileMarker,
            ContentType = "image/png",
            RelativePath = relativePath,
            SizeBytes = 8,
            AltText = ActivityNameMarker,
            ActivityId = activityId,
            CreatedAt = now,
        });

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = tenantAId,
            Subject = SubjectMarker,
            Body = BodyMarker,
            BodyFormat = CampaignBodyFormat.Plain,
            EmailTemplateId = template.Id,
            Status = CampaignStatus.Completed,
            CreatedAt = now,
            SentAt = now,
            SentCount = 1,
            FailedCount = 0,
            SkippedCount = 0,
        };
        campaign.Recipients.Add(new CampaignRecipient
        {
            Id = Guid.NewGuid(),
            TenantId = tenantAId,
            CampaignId = campaign.Id,
            ClientId = client.Id,
            Email = RecipientEmailMarker,
            Status = CampaignRecipientStatus.Sent,
        });
        db.Campaigns.Add(campaign);

        await db.SaveChangesAsync();
        return (campaign.Id, template.Id, client.Id, assetId);
    }

    private async Task<ProIsolationTenant> CreateProTenantAsync(string name)
    {
        var slug = $"cmp-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            name,
            slug,
            adminEmail);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var row = await db.Tenants.SingleAsync(item => item.Id == tenant.Id);
            row.Plan = TenantPlan.Pro;
            row.AdminContactEmail = adminEmail;
            row.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }

        var (_, password) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        return new ProIsolationTenant(tenant.Id, slug, adminEmail, password);
    }

    private async Task<HttpClient> CreateProOperatorClientAsync(ProIsolationTenant tenant)
    {
        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, tenant.Slug);
        var token = await IntegrationTestHelpers.LoginAsync(client, tenant.AdminEmail, tenant.Password);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private static async Task AssertDeniedWithoutLeakAsync(HttpResponseMessage response, string surface)
    {
        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404 or 403 for {surface}, got {(int)response.StatusCode}.");
        await AssertNoLeakAsync(await response.Content.ReadAsStringAsync(), surface);
    }

    private static Task AssertNoLeakAsync(string body, string surface)
    {
        Assert.DoesNotContain(SubjectMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(BodyMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(RecipientNameMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(RecipientEmailMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(TemplateNameMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(ActivityNameMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(AssetFileMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain("1 sent", body, StringComparison.OrdinalIgnoreCase);
        _ = surface;
        return Task.CompletedTask;
    }

    private sealed record ProIsolationTenant(
        Guid Id,
        string Slug,
        string AdminEmail,
        string Password);
}
