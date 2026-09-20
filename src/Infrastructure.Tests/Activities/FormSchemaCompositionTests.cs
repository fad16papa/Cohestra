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
    public void MapToDomain_RoundTripsColumnsComposition()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [
                new FormFieldDefinitionDto("a", FormFieldTypes.Text, "A", true, null, null, null, null),
                new FormFieldDefinitionDto("b", FormFieldTypes.Text, "B", true, null, null, null, null),
            ],
            Composition:
            [
                new FormCompositionNodeDto(
                    "cols-1",
                    FormCompositionKinds.Columns,
                    Columns:
                    [
                        [new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "a")],
                        [new FormCompositionNodeDto("n2", FormCompositionKinds.FieldRef, FieldId: "b")],
                    ]),
            ]);

        var domain = FormSchemaValidator.MapToDomain(dto);
        var mappedBack = FormSchemaMapper.ToDto(domain);

        Assert.NotNull(mappedBack?.Composition);
        Assert.Equal(FormCompositionKinds.Columns, mappedBack!.Composition![0].Kind);
        Assert.Equal(2, mappedBack.Composition[0].Columns!.Count);
    }

    [Fact]
    public void ValidateModel_RejectsVersion1WithStoredComposition()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
            Composition =
            [
                new FormCompositionNode
                {
                    Id = "n1",
                    Kind = FormCompositionKinds.FieldRef,
                    FieldId = "email",
                },
            ],
        };

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.Equal("Form schema version 1 cannot include composition.", error);
    }

    [Fact]
    public void ValidateModel_RejectsVersion2WithoutComposition()
    {
        var schema = new ActivityFormSchema
        {
            Version = 2,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
        };

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.Equal("Form schema version 2 requires composition.", error);
    }

    [Fact]
    public void ValidateDto_RejectsDuplicateFieldRef()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
                new FormCompositionNodeDto("n2", FormCompositionKinds.FieldRef, FieldId: "email"),
            ]);

        var error = FormSchemaValidator.ValidateDto(dto);

        Assert.Contains("more than once", error, StringComparison.OrdinalIgnoreCase);
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

    [Fact]
    public void ValidateDto_AcceptsCanonicalDomainBlocks()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto(
                    "details",
                    FormCompositionKinds.Domain,
                    Domain: FormCompositionDomainTypes.ActivityDetails),
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
            ]);

        Assert.Null(FormSchemaValidator.ValidateDto(dto));
    }

    [Fact]
    public void ValidateDto_RejectsUnknownDomainType()
    {
        var dto = new ActivityFormSchemaDto(
            2,
            [new FormFieldDefinitionDto("email", FormFieldTypes.Email, "Email", true, null, null, null, null)],
            Composition:
            [
                new FormCompositionNodeDto(
                    "bad",
                    FormCompositionKinds.Domain,
                    Domain: "location"),
                new FormCompositionNodeDto("n1", FormCompositionKinds.FieldRef, FieldId: "email"),
            ]);

        var error = FormSchemaValidator.ValidateDto(dto);

        Assert.Contains("Unsupported domain", error, StringComparison.OrdinalIgnoreCase);
    }
}
