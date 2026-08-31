using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Clients;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class HiddenFieldRegistrationIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_HiddenRef_PersistsAnswerAndClientHistory()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"hidden-ref-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendHiddenRefFieldAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            BaseAnswers(email, "wa"));

        Assert.Equal("created", response.Status);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var registration = await dbContext.Registrations
            .AsNoTracking()
            .SingleAsync(item => item.Id == response.RegistrationId);

        Assert.Equal("wa", ReadAnswerString(registration.Answers, "ref"));

        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);
        var detailResponse = await client.GetAsync($"/api/v1/admin/clients/{response.ClientId}");
        detailResponse.EnsureSuccessStatusCode();
        var detail = await detailResponse.Content.ReadFromJsonAsync<ClientDetailResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(detail);
        var history = Assert.Single(detail.RegistrationHistory);
        var hidden = Assert.Single(history.Answers, answer => answer.FieldId == "ref");
        Assert.Equal("Campaign ref", hidden.Label);
        Assert.Equal("wa", hidden.Value);
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_MissingHiddenRef_StillCreated()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"hidden-missing-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendHiddenRefFieldAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var raw = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            BaseAnswers(email));

        Assert.Equal(HttpStatusCode.Created, raw.StatusCode);
    }

    private async Task AppendHiddenRefFieldAsync(Guid activityId)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var activity = await dbContext.Activities.SingleAsync(item => item.Id == activityId);
        if (activity.FormSchema is null)
        {
            throw new InvalidOperationException("Seeded activity is missing a form schema.");
        }

        var fields = activity.FormSchema.Fields.ToList();
        fields.Add(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
                Required = true,
            });

        activity.FormSchema = new ActivityFormSchema
        {
            Version = activity.FormSchema.Version,
            Meta = activity.FormSchema.Meta,
            Fields = fields,
        };
        activity.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync();
    }

    private static Dictionary<string, object?> BaseAnswers(string email, string? campaignRef = null)
    {
        var answers = new Dictionary<string, object?>
        {
            ["full_name"] = "Maya Cruz",
            ["phone"] = "09181234567",
            ["email"] = email,
            ["consent"] = true,
        };

        if (campaignRef is not null)
        {
            answers["ref"] = campaignRef;
        }

        return answers;
    }

    private static string? ReadAnswerString(IReadOnlyDictionary<string, object?> answers, string key)
    {
        if (!answers.TryGetValue(key, out var raw) || raw is null)
        {
            return null;
        }

        if (raw is string text)
        {
            return text;
        }

        if (raw is JsonElement json && json.ValueKind == JsonValueKind.String)
        {
            return json.GetString();
        }

        return raw.ToString();
    }
}
