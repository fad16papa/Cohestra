using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormSchemaCompositionTests
{
    [Fact]
    public void SynthesizeLinearComposition_MatchesFieldOrder()
    {
        var fields = new List<FormFieldDefinition>
        {
            new() { Id = "name", Type = FormFieldTypes.Text, Label = "Name", Required = true },
            new() { Id = "email", Type = FormFieldTypes.Email, Label = "Email", Required = true },
        };

        var nodes = FormSchemaCompositionNormalizer.SynthesizeLinearComposition(fields);

        Assert.Equal(2, nodes.Count);
        Assert.Equal(FormCompositionKinds.FieldRef, nodes[0].Kind);
        Assert.Equal("name", nodes[0].FieldId);
    }

    [Fact]
    public void ValidateDto_RejectsCompositionOnVersion1()
    {
        var dto = new ActivityFormSchemaDto(
            1,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
            ]);

        var error = FormSchemaValidator.ValidateDto(dto);

        Assert.Equal("Composition requires form schema version 2.", error);
    }

    [Fact]
    public void ValidateDto_AcceptsVersion2WithMatchingComposition()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
            ]);

        Assert.Null(FormSchemaValidator.ValidateDto(dto));
    }

    [Fact]
    public void MapToDomain_RoundTripsComposition()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto(
                    "section-1",
                    FormCompositionKinds.Section,
                    Title: "About you",
                    Children:
                    [
                        new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
                    ]),
            ]);

        var domain = FormSchemaValidator.MapToDomain(dto);
        var mappedBack = FormSchemaMapper.ToDto(domain);

        Assert.NotNull(mappedBack);
        Assert.Equal(2, mappedBack!.Version);
        Assert.NotNull(mappedBack.Composition);
        Assert.Equal(FormCompositionKinds.Section, mappedBack.Composition![0].Kind);
    }

    [Fact]
    public void ValidateDto_RejectsUnknownFieldRef()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "missing"),
            ]);

        var error = FormSchemaValidator.ValidateDto(dto);

        Assert.Contains("unknown field", error, StringComparison.OrdinalIgnoreCase);
    }
}
