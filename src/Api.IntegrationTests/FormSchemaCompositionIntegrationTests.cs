using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class FormSchemaCompositionIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SaveFormSchema_Version2CompositionOrder_RoundTripsThroughAdminAndPublic()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var slug = $"comp-{Guid.NewGuid():N}"[..18];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            name: $"Composition {Guid.NewGuid():N}"[..24]);

        var v2Schema = new ActivityFormSchemaDto(
            Version: 2,
            Fields:
            [
                new FormFieldDefinitionDto(
                    "name",
                    FormFieldTypes.Text,
                    "Name",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "email",
                    FormFieldTypes.Email,
                    "Email",
                    true,
                    null,
                    null,
                    null,
                    null),
            ],
            Composition:
            [
                new FormCompositionNodeDto(
                    "field-ref-email",
                    FormCompositionKinds.FieldRef,
                    FieldId: "email"),
                new FormCompositionNodeDto(
                    "field-ref-name",
                    FormCompositionKinds.FieldRef,
                    FieldId: "name"),
            ]);

        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(v2Schema),
            IntegrationTestHelpers.JsonOptions);
        saveResponse.EnsureSuccessStatusCode();

        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(saved?.FormSchema);
        Assert.Equal(2, saved!.FormSchema!.Version);
        Assert.NotNull(saved.FormSchema.Composition);
        Assert.Equal(
            new[] { "email", "name" },
            saved.FormSchema.Composition!
                .Where(node => node.Kind == FormCompositionKinds.FieldRef)
                .Select(node => node.FieldId!)
                .ToArray());

        using var reloadResponse = await client.GetAsync(
            $"/api/v1/admin/activities/{activity.Id}");
        reloadResponse.EnsureSuccessStatusCode();
        var reloaded = await reloadResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(reloaded?.FormSchema?.Composition);
        Assert.Equal(
            new[] { "email", "name" },
            reloaded!.FormSchema!.Composition!
                .Where(node => node.Kind == FormCompositionKinds.FieldRef)
                .Select(node => node.FieldId!)
                .ToArray());

        using var publicResponse = await client.GetAsync(
            $"/api/v1/public/activities/{slug}");
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
        var publicActivity = await publicResponse.Content.ReadFromJsonAsync<PublicActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(publicActivity?.FormSchema);
        Assert.Equal(2, publicActivity!.FormSchema!.Version);
        Assert.NotNull(publicActivity.FormSchema.Composition);
    }

    [SkippableFact]
    public async Task SaveFormSchema_Version1_DoesNotPersistComposition()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var slug = $"v1-{Guid.NewGuid():N}"[..18];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        var v1Schema = new ActivityFormSchemaDto(
            Version: 1,
            Fields:
            [
                new FormFieldDefinitionDto(
                    "email",
                    FormFieldTypes.Email,
                    "Email",
                    true,
                    null,
                    null,
                    null,
                    null),
            ]);

        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(v1Schema),
            IntegrationTestHelpers.JsonOptions);
        saveResponse.EnsureSuccessStatusCode();

        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(saved?.FormSchema);
        Assert.Equal(1, saved!.FormSchema!.Version);
        Assert.Null(saved.FormSchema.Composition);
    }

    [SkippableFact]
    public async Task SaveFormSchema_MixedComposition_RoundTripsNestedStructure()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var slug = $"mix-{Guid.NewGuid():N}"[..18];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        var mixedSchema = BuildMixedCompositionSchema();

        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(mixedSchema),
            IntegrationTestHelpers.JsonOptions);
        saveResponse.EnsureSuccessStatusCode();

        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(saved?.FormSchema);
        AssertCompositionTreeEqual(mixedSchema.Composition!, saved!.FormSchema!.Composition!);

        using var reloadResponse = await client.GetAsync(
            $"/api/v1/admin/activities/{activity.Id}");
        reloadResponse.EnsureSuccessStatusCode();
        var reloaded = await reloadResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(reloaded?.FormSchema?.Composition);
        AssertCompositionTreeEqual(mixedSchema.Composition!, reloaded!.FormSchema!.Composition!);
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_MixedComposition_PersistsOnlyFieldAnswers()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var slug = $"mix-reg-{Guid.NewGuid():N}"[..18];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        var mixedSchema = BuildMixedCompositionSchema();
        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(mixedSchema),
            IntegrationTestHelpers.JsonOptions);
        saveResponse.EnsureSuccessStatusCode();

        var email = $"mix-{Guid.NewGuid():N}@example.com";
        var submitResponse = await IntegrationTestHelpers.SubmitRegistrationAsync(
            Factory.CreateClient(),
            slug,
            new Dictionary<string, object?>
            {
                ["field_a"] = "Ada Lovelace",
                ["field_b"] = "b@example.com",
                ["field_c"] = "c@example.com",
                ["consent"] = true,
            });

        Assert.Equal("created", submitResponse.Status);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var registration = await dbContext.Registrations
            .AsNoTracking()
            .SingleAsync(item => item.Id == submitResponse.RegistrationId);

        Assert.True(registration.Answers.ContainsKey("field_a"));
        Assert.True(registration.Answers.ContainsKey("field_b"));
        Assert.True(registration.Answers.ContainsKey("field_c"));
        foreach (var key in registration.Answers.Keys)
        {
            Assert.DoesNotContain(
                key,
                new[] { "heading", "paragraph", "divider", "section", "heading-top", "para-top" },
                StringComparer.Ordinal);
        }
    }

    [SkippableFact]
    public async Task SaveFormSchema_ColumnsComposition_RoundTripsStructure()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var slug = $"cols-{Guid.NewGuid():N}"[..18];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        var schema = BuildColumnsCompositionSchema();
        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(schema),
            IntegrationTestHelpers.JsonOptions);
        saveResponse.EnsureSuccessStatusCode();

        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(saved?.FormSchema?.Composition);
        AssertCompositionTreeEqual(schema.Composition!, saved!.FormSchema!.Composition!);
    }

    private static ActivityFormSchemaDto BuildColumnsCompositionSchema()
    {
        return new ActivityFormSchemaDto(
            Version: 2,
            Fields:
            [
                new FormFieldDefinitionDto(
                    "first_name",
                    FormFieldTypes.Text,
                    "First name",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "last_name",
                    FormFieldTypes.Text,
                    "Last name",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "email",
                    FormFieldTypes.Email,
                    "Email",
                    true,
                    null,
                    null,
                    null,
                    null),
            ],
            Composition:
            [
                new FormCompositionNodeDto(
                    "cols-names",
                    FormCompositionKinds.Columns,
                    Columns:
                    [
                        [
                            new FormCompositionNodeDto(
                                "ref-first",
                                FormCompositionKinds.FieldRef,
                                FieldId: "first_name"),
                        ],
                        [
                            new FormCompositionNodeDto(
                                "ref-last",
                                FormCompositionKinds.FieldRef,
                                FieldId: "last_name"),
                        ],
                    ]),
                new FormCompositionNodeDto(
                    "ref-email",
                    FormCompositionKinds.FieldRef,
                    FieldId: "email"),
            ]);
    }

    private static ActivityFormSchemaDto BuildMixedCompositionSchema()
    {
        return new ActivityFormSchemaDto(
            Version: 2,
            Fields:
            [
                new FormFieldDefinitionDto(
                    "field_a",
                    FormFieldTypes.Text,
                    "Field A",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "field_b",
                    FormFieldTypes.Email,
                    "Field B",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "field_c",
                    FormFieldTypes.Email,
                    "Field C",
                    true,
                    null,
                    null,
                    null,
                    null),
                new FormFieldDefinitionDto(
                    "consent",
                    FormFieldTypes.Consent,
                    "Consent",
                    true,
                    null,
                    null,
                    "I agree.",
                    null),
            ],
            Composition:
            [
                new FormCompositionNodeDto(
                    "heading-top",
                    FormCompositionKinds.Content,
                    ContentType: FormCompositionContentTypes.Heading,
                    Content: new FormCompositionContentPropsDto("About you", 2)),
                new FormCompositionNodeDto(
                    "ref-field-a",
                    FormCompositionKinds.FieldRef,
                    FieldId: "field_a"),
                new FormCompositionNodeDto(
                    "para-top",
                    FormCompositionKinds.Content,
                    ContentType: FormCompositionContentTypes.Paragraph,
                    Content: new FormCompositionContentPropsDto(
                        "We'll only use this for the activity.")),
                new FormCompositionNodeDto(
                    "section-prefs",
                    FormCompositionKinds.Section,
                    Title: "Preferences",
                    Children:
                    [
                        new FormCompositionNodeDto(
                            "heading-section",
                            FormCompositionKinds.Content,
                            ContentType: FormCompositionContentTypes.Heading,
                            Content: new FormCompositionContentPropsDto("Preferences", 2)),
                        new FormCompositionNodeDto(
                            "ref-field-b",
                            FormCompositionKinds.FieldRef,
                            FieldId: "field_b"),
                    ]),
                new FormCompositionNodeDto(
                    "divider-1",
                    FormCompositionKinds.Content,
                    ContentType: FormCompositionContentTypes.Divider),
                new FormCompositionNodeDto(
                    "ref-field-c",
                    FormCompositionKinds.FieldRef,
                    FieldId: "field_c"),
                new FormCompositionNodeDto(
                    "ref-consent",
                    FormCompositionKinds.FieldRef,
                    FieldId: "consent"),
            ]);
    }

    private static void AssertCompositionTreeEqual(
        IReadOnlyList<FormCompositionNodeDto> expected,
        IReadOnlyList<FormCompositionNodeDto> actual)
    {
        Assert.Equal(expected.Count, actual.Count);
        for (var index = 0; index < expected.Count; index++)
        {
            var exp = expected[index];
            var act = actual[index];
            Assert.Equal(exp.Id, act.Id);
            Assert.Equal(exp.Kind, act.Kind);
            Assert.Equal(exp.FieldId, act.FieldId);
            Assert.Equal(exp.ContentType, act.ContentType);
            Assert.Equal(exp.Content?.Text, act.Content?.Text);
            Assert.Equal(exp.Content?.Level, act.Content?.Level);
            Assert.Equal(exp.Title, act.Title);
            Assert.Equal(exp.Description, act.Description);

            if (exp.Children is { Count: > 0 })
            {
                Assert.NotNull(act.Children);
                AssertCompositionTreeEqual(exp.Children, act.Children);
            }
            else
            {
                Assert.True(act.Children is null or { Count: 0 });
            }

            if (exp.Columns is { Count: > 0 })
            {
                Assert.NotNull(act.Columns);
                Assert.Equal(exp.Columns.Count, act.Columns!.Count);
                for (var columnIndex = 0; columnIndex < exp.Columns.Count; columnIndex++)
                {
                    AssertCompositionTreeEqual(exp.Columns[columnIndex], act.Columns[columnIndex]);
                }
            }
            else
            {
                Assert.True(act.Columns is null or { Count: 0 });
            }
        }
    }
}
