using System.Net;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class Wave1RegistrationIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_Wave1Answers_Persist()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"wave1-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendWave1FieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            BaseAnswers(email, includeWave1: true));

        Assert.Equal("created", response.Status);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var registration = await dbContext.Registrations
            .AsNoTracking()
            .SingleAsync(item => item.Id == response.RegistrationId);

        Assert.Equal("3", ReadAnswerString(registration.Answers, "party_size"));
        Assert.Equal("09:30", ReadAnswerString(registration.Answers, "arrival"));
        Assert.Equal("PH", ReadAnswerString(registration.Answers, "nationality"));
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_InvalidNumber_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"wave1-bad-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendWave1FieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var answers = BaseAnswers($"maya-{Guid.NewGuid():N}@example.com", includeWave1: true);
        answers["party_size"] = "abc";
        var raw = await IntegrationTestHelpers.SubmitRegistrationRawAsync(client, slug, answers);

        Assert.Equal(HttpStatusCode.BadRequest, raw.StatusCode);
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_MissingOptionalWave1_Returns201()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"wave1-opt-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendWave1FieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var raw = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            BaseAnswers($"maya-{Guid.NewGuid():N}@example.com"));

        Assert.Equal(HttpStatusCode.Created, raw.StatusCode);
    }

    private async Task AppendWave1FieldsAsync(Guid activityId)
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
        fields.Add(new FormFieldDefinition { Id = "party_size", Type = FormFieldTypes.Number, Label = "Party size", Max = 8 });
        fields.Add(new FormFieldDefinition { Id = "website", Type = FormFieldTypes.Url, Label = "Website" });
        fields.Add(new FormFieldDefinition { Id = "arrival", Type = FormFieldTypes.Time, Label = "Arrival" });
        fields.Add(new FormFieldDefinition
        {
            Id = "level",
            Type = FormFieldTypes.Choice,
            Label = "Level",
            Options =
            [
                new FormFieldOption { Value = "beginner", Label = "Beginner" },
                new FormFieldOption { Value = "advanced", Label = "Advanced" },
            ],
        });
        fields.Add(new FormFieldDefinition { Id = "bringing_guest", Type = FormFieldTypes.YesNo, Label = "Guest?" });
        fields.Add(new FormFieldDefinition
        {
            Id = "days",
            Type = FormFieldTypes.MultiChoice,
            Label = "Days",
            Options =
            [
                new FormFieldOption { Value = "sat", Label = "Saturday" },
                new FormFieldOption { Value = "sun", Label = "Sunday" },
            ],
        });
        fields.Add(new FormFieldDefinition { Id = "notice", Type = FormFieldTypes.Info, Label = "Note", InfoText = "Hi" });
        fields.Add(new FormFieldDefinition { Id = "nationality", Type = FormFieldTypes.Country, Label = "Nationality" });

        activity.FormSchema = new ActivityFormSchema
        {
            Version = activity.FormSchema.Version,
            Meta = activity.FormSchema.Meta,
            Fields = fields,
        };
        activity.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync();
    }

    private static Dictionary<string, object?> BaseAnswers(string email, bool includeWave1 = false)
    {
        var answers = new Dictionary<string, object?>
        {
            ["full_name"] = "Maya Cruz",
            ["phone"] = "09181234567",
            ["email"] = email,
            ["consent"] = true,
        };

        if (includeWave1)
        {
            answers["party_size"] = "3";
            answers["website"] = "https://example.com";
            answers["arrival"] = "09:30";
            answers["level"] = "beginner";
            answers["bringing_guest"] = false;
            answers["days"] = new[] { "sat" };
            answers["nationality"] = "PH";
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
