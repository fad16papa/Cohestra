using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Platform;
using Cohestra.Contracts.Registrations;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

internal static class IntegrationTestHelpers
{
    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    internal static void SkipIfUnavailable(IntegrationTestWebApplicationFactory factory)
    {
        Skip.If(!factory.IsAvailable, factory.SkipReason ?? "Integration dependencies unavailable.");
    }

    /// <summary>
    /// HTTP-less scopes need Platform 0 bound so EF tenant query filters see default-tenant rows.
    /// </summary>
    internal static void BindDefaultTenant(IServiceProvider services)
    {
        var current = services.GetService<CurrentTenant>()
            ?? services.GetService<ICurrentTenant>() as CurrentTenant;
        current?.SetResolved(TenantIds.Default, TenantIds.DefaultSlug);
    }

    /// <summary>
    /// Integration tests assume full operator capabilities (site builder, campaigns, high plan limits).
    /// Default tenant migrates as Basic; Epic 15 plan gates block most admin flows until Pro.
    /// </summary>
    internal static async Task EnsureDefaultTenantProPlanAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == TenantIds.Default);

        if (tenant is null)
        {
            return;
        }

        var changed = false;
        if (tenant.Plan != TenantPlan.Pro)
        {
            tenant.Plan = TenantPlan.Pro;
            changed = true;
        }

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            tenant.AdminContactEmail = "operator@cohestra.local";
            changed = true;
        }

        if (!changed)
        {
            return;
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync();
    }

    internal static async Task<string> LoginAsOperatorAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("operator@cohestra.local", "ChangeMe123!"),
            JsonOptions);

        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthTokenResponse>(JsonOptions);
        return auth?.AccessToken
            ?? throw new InvalidOperationException("Login response did not include an access token.");
    }

    internal static async Task<string> LoginAsPlatformAdminAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("platform-admin@cohestra.local", "ChangeMe123!"),
            JsonOptions);

        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthTokenResponse>(JsonOptions);
        return auth?.AccessToken
            ?? throw new InvalidOperationException("Platform admin login response did not include an access token.");
    }

    internal static async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, password),
            JsonOptions);

        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthTokenResponse>(JsonOptions);
        return auth?.AccessToken
            ?? throw new InvalidOperationException("Login response did not include an access token.");
    }

    internal static void UseBearerToken(HttpClient client, string accessToken)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    }

    /// <summary>
    /// Bind HTTP Host to <c>{slug}.localhost</c> for TenantResolutionMiddleware (AD-3 — never X-Tenant-Id).
    /// </summary>
    internal static void UseTenantHost(HttpClient client, string slug)
    {
        client.DefaultRequestHeaders.Host = $"{slug}.localhost";
    }

    internal static async Task<TenantResponse> CreateTenantViaPlatformAsync(
        HttpClient platformClient,
        string name,
        string slug,
        string adminContactEmail)
    {
        using var response = await platformClient.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest(name, slug, "Basic", adminContactEmail),
            JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<TenantResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Platform create-tenant response body was empty.");
    }

    /// <summary>
    /// Creates an Identity user and TenantAdmin membership for the given tenant.
    /// Login with Host <c>{slug}.localhost</c> to mint a tenant-bound JWT.
    /// </summary>
    internal static async Task<(ApplicationUser User, string Password)> CreateTenantAdminUserAsync(
        IServiceProvider services,
        Guid tenantId,
        string email,
        string password = "ChangeMe123!")
    {
        await using var scope = services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var membership = scope.ServiceProvider.GetRequiredService<ITenantMembershipService>();

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to create tenant admin user: " +
                string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        var membershipResult = await membership.EnsureMembershipAsync(
            user.Id,
            tenantId,
            TenantMembershipRole.TenantAdmin);
        if (!membershipResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to ensure TenantAdmin membership: {membershipResult.Detail}");
        }

        return (user, password);
    }

    /// <summary>
    /// Creates an Identity user and TenantMember membership for the given tenant.
    /// </summary>
    internal static async Task<(ApplicationUser User, string Password)> CreateTenantMemberUserAsync(
        IServiceProvider services,
        Guid tenantId,
        string email,
        string password = "ChangeMe123!")
    {
        await using var scope = services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var membership = scope.ServiceProvider.GetRequiredService<ITenantMembershipService>();

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to create tenant member user: " +
                string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        var membershipResult = await membership.EnsureMembershipAsync(
            user.Id,
            tenantId,
            TenantMembershipRole.TenantMember);
        if (!membershipResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to ensure TenantMember membership: {membershipResult.Detail}");
        }

        return (user, password);
    }

    /// <summary>
    /// Direct JWT mint for a tenant-scoped session (bypasses login Host binding when needed).
    /// </summary>
    internal static string MintTenantAccessToken(
        IServiceProvider services,
        ApplicationUser user,
        Guid tenantId,
        TenantMembershipRole membershipRole = TenantMembershipRole.TenantAdmin)
    {
        using var scope = services.CreateScope();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var (accessToken, _) = jwt.CreateAccessToken(user, roles: [], tenantId, membershipRole);
        return accessToken;
    }

    internal static async Task<Activity> SeedPublishedActivityAsync(
        IServiceProvider services,
        string slug,
        CancellationToken cancellationToken = default) =>
        await SeedPublishedActivityForTenantAsync(
            services,
            TenantIds.Default,
            slug,
            name: null,
            maxRegistrants: null,
            cancellationToken);

    internal static async Task<Activity> SeedPublishedActivityForTenantAsync(
        IServiceProvider services,
        Guid tenantId,
        string slug,
        string? name = null,
        int? maxRegistrants = null,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name ?? "Integration Test Activity",
            Slug = slug,
            Category = "Test",
            Schedule = "Saturday 10:00",
            Location = "Test Court",
            CommunityLabel = "Integration Community",
            MaxRegistrants = maxRegistrants,
            Status = ActivityStatus.Published,
            ShowOnHomepage = true,
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "full_name",
                        Type = "text",
                        Label = "Full Name",
                        Required = true,
                    },
                    new FormFieldDefinition
                    {
                        Id = "phone",
                        Type = "phone",
                        Label = "Phone",
                        Required = true,
                        PhoneCountry = "PH",
                    },
                    new FormFieldDefinition
                    {
                        Id = "email",
                        Type = "email",
                        Label = "Email",
                        Required = false,
                    },
                    new FormFieldDefinition
                    {
                        Id = "consent",
                        Type = "consent",
                        Label = "Consent",
                        Required = true,
                        ConsentText = "I agree to be contacted about future activities.",
                    },
                ],
            },
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return activity;
    }

    internal static async Task EnsureDefaultSitePublishedAsync(HttpClient adminClient)
    {
        var draft = CreateMinimalPublishableSiteDraft();
        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await adminClient.PostAsync("/api/v1/admin/site/publish", content: null);
        publishResponse.EnsureSuccessStatusCode();
    }

    internal static SiteSectionsDocumentDto CreateMinimalPublishableSiteDraft()
    {
        using var propsDocument = JsonDocument.Parse(
            """
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);
        var heroProps = JsonSerializer.Deserialize<JsonElement>(propsDocument.RootElement.GetRawText());

        using var upcomingPropsDocument = JsonDocument.Parse("""{"limit": 6}""");
        var upcomingProps = JsonSerializer.Deserialize<JsonElement>(upcomingPropsDocument.RootElement.GetRawText());

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, heroProps),
                new SiteSectionDto("upcoming-1", "upcomingActivities", true, 1, upcomingProps),
            ]);
    }

    internal static async Task<Client> SeedClientAsync(
        IServiceProvider services,
        Action<Client> configure,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;

        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Integration Client",
            LeadStatus = LeadStatus.New,
            CreatedAt = now,
            UpdatedAt = now,
        };

        configure(client);
        dbContext.Clients.Add(client);
        await dbContext.SaveChangesAsync(cancellationToken);
        return client;
    }

    internal static async Task<HttpResponseMessage> SubmitRegistrationRawAsync(
        HttpClient client,
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers)
    {
        return await client.PostAsJsonAsync(
            "/api/v1/public/registrations",
            new SubmitPublicRegistrationRequest(activitySlug, answers),
            JsonOptions);
    }

    internal static async Task<string?> ReadProblemErrorCodeAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        if (root.TryGetProperty("errorCode", out var code))
        {
            return code.GetString();
        }

        if (root.TryGetProperty("extensions", out var extensions)
            && extensions.TryGetProperty("errorCode", out var nestedCode))
        {
            return nestedCode.GetString();
        }

        return null;
    }

    internal static async Task<SubmitPublicRegistrationResponse> SubmitRegistrationAsync(
        HttpClient client,
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers)
    {
        var response = await SubmitRegistrationRawAsync(client, activitySlug, answers);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<SubmitPublicRegistrationResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Registration response body was empty.");
    }

    internal static async Task ProcessOutboxUntilIdleAsync(
        IServiceProvider services,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default)
    {
        var deadline = DateTime.UtcNow + (timeout ?? TimeSpan.FromSeconds(30));

        while (DateTime.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();

            await using var scope = services.CreateAsyncScope();
            var processor = scope.ServiceProvider.GetRequiredService<IOutboxProcessor>();
            var processed = await processor.ProcessBatchAsync(cancellationToken);

            if (processed == 0)
            {
                return;
            }
        }

        throw new TimeoutException("Outbox did not drain within the allotted time.");
    }
}
