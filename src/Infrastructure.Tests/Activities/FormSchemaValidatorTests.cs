using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormSchemaValidatorTests
{
    [Fact]
    public void ValidateModel_AcceptsIntroMarkdownInMeta()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { IntroMarkdown = "Welcome to our event." },
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

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_RejectsIntroMarkdownOverMaxLength()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { IntroMarkdown = new string('a', 4001) },
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

        Assert.NotNull(error);
        Assert.Contains("Intro copy", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_AcceptsSectionHeaderField()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "contact",
                    Type = FormFieldTypes.SectionHeader,
                    Label = "Contact details",
                    Required = false,
                },
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
        };

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_RejectsRequiredSectionHeader()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "contact",
                    Type = FormFieldTypes.SectionHeader,
                    Label = "Contact details",
                    Required = true,
                },
            ],
        };

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("section_header", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsSectionHeaderWithEmptyLabel()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "section",
                    Type = FormFieldTypes.SectionHeader,
                    Label = "   ",
                    Required = false,
                },
            ],
        };

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("label is required", error, StringComparison.Ordinal);
    }

    [Fact]
    public void MapToDomain_TrimsIntroMarkdown()
    {
        var dto = new ActivityFormSchemaDto(
            1,
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
            ],
            new FormSchemaMetaDto("  Hello there  "));

        var schema = FormSchemaValidator.MapToDomain(dto);

        Assert.Equal("Hello there", schema.Meta?.IntroMarkdown);
    }
}
