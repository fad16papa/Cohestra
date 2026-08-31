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
public sealed class LongTextAndDateRegistrationIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_ValidNotesAndDate_PersistsAnswers()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"long-text-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendCaptureFieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            BaseAnswers(email, notes: "Prefers Saturday mornings", preferredDate: "2026-09-12", campaignRef: "wa"));

        Assert.Equal("created", response.Status);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var registration = await dbContext.Registrations
            .AsNoTracking()
            .SingleAsync(item => item.Id == response.RegistrationId);

        Assert.Equal("Prefers Saturday mornings", ReadAnswerString(registration.Answers, "notes"));
        Assert.Equal("2026-09-12", ReadAnswerString(registration.Answers, "preferred_date"));
        Assert.Equal("wa", ReadAnswerString(registration.Answers, "ref"));
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_InvalidDate_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"bad-date-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendCaptureFieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var raw = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            BaseAnswers(email, notes: "Notes", preferredDate: "2026-02-30"));

        Assert.Equal(HttpStatusCode.BadRequest, raw.StatusCode);
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_MissingOptionalDate_Returns201()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"optional-date-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await AppendCaptureFieldsAsync(activity.Id);

        using var client = Factory.CreateClient();
        var email = $"maya-{Guid.NewGuid():N}@example.com";
        var raw = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            BaseAnswers(email, notes: "Notes only"));

        Assert.Equal(HttpStatusCode.Created, raw.StatusCode);
    }

    private async Task AppendCaptureFieldsAsync(Guid activityId)
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
            });
        fields.Add(
            new FormFieldDefinition
            {
                Id = "notes",
                Type = FormFieldTypes.Textarea,
                Label = "Notes",
            });
        fields.Add(
            new FormFieldDefinition
            {
                Id = "preferred_date",
                Type = FormFieldTypes.Date,
                Label = "Preferred date",
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

    private static Dictionary<string, object?> BaseAnswers(
        string email,
        string? notes = null,
        string? preferredDate = null,
        string? campaignRef = null)
    {
        var answers = new Dictionary<string, object?>
        {
            ["full_name"] = "Maya Cruz",
            ["phone"] = "09181234567",
            ["email"] = email,
            ["consent"] = true,
        };

        if (notes is not null)
        {
            answers["notes"] = notes;
        }

        if (preferredDate is not null)
        {
            answers["preferred_date"] = preferredDate;
        }

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
