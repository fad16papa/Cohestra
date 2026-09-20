using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;

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
}
