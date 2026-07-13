using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Registrations;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

internal static class IntegrationTestHelpers
{
    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    internal static void SkipIfUnavailable(IntegrationTestWebApplicationFactory factory)
    {
        Skip.If(!factory.IsAvailable, factory.SkipReason ?? "Integration dependencies unavailable.");
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

    internal static void UseBearerToken(HttpClient client, string accessToken)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    }

    internal static async Task<Activity> SeedPublishedActivityAsync(
        IServiceProvider services,
        string slug,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Integration Test Activity",
            Slug = slug,
            Category = "Test",
            Schedule = "Saturday 10:00",
            Location = "Test Court",
            CommunityLabel = "Integration Community",
            Status = ActivityStatus.Published,
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

    internal static async Task<Client> SeedClientAsync(
        IServiceProvider services,
        Action<Client> configure,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
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

    internal static async Task<SubmitPublicRegistrationResponse> SubmitRegistrationAsync(
        HttpClient client,
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/public/registrations",
            new SubmitPublicRegistrationRequest(activitySlug, answers),
            JsonOptions);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<SubmitPublicRegistrationResponse>(JsonOptions)
            ?? throw new InvalidOperationException("Registration response body was empty.");
    }
}
