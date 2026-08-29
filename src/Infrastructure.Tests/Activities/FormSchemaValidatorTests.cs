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

    [Fact]
    public void ValidateModel_AcceptsHiddenFieldWithDefaultValue()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
                Required = true,
                DefaultValue = "  ig  ",
            });

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_ExistingV1TypesRemainValidWithoutHidden()
    {
        Assert.Null(FormSchemaValidator.ValidateModel(ContactSchema()));
    }

    [Fact]
    public void ValidateModel_RejectsUnknownFieldType()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "mystery",
                Type = "mystery",
                Label = "Mystery",
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("must be one of:", error, StringComparison.Ordinal);
        Assert.Contains("hidden", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsHiddenPlaceholder()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
                Placeholder = "do not show",
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("placeholder", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsHiddenOptions()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
                Options = [new FormFieldOption { Value = "wa", Label = "WhatsApp" }],
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("options", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsHiddenDefaultValueOverMaxLength()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
                DefaultValue = new string('a', 201),
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("defaultValue", error, StringComparison.Ordinal);
    }

    [Fact]
    public void MapToDomain_StripsHtmlFromHiddenDefaultValue()
    {
        var dto = new ActivityFormSchemaDto(
            1,
            [
                new FormFieldDefinitionDto(
                    "ref",
                    FormFieldTypes.Hidden,
                    "Campaign ref",
                    false,
                    null,
                    null,
                    null,
                    null,
                    DefaultValue: "  <b>wa</b>  "),
            ]);

        var schema = FormSchemaValidator.MapToDomain(dto);

        Assert.Equal("wa", schema.Fields[0].DefaultValue);
    }

    private static ActivityFormSchema ContactSchema(params FormFieldDefinition[] extraFields)
    {
        var fields = new List<FormFieldDefinition>
        {
            new()
            {
                Id = "full_name",
                Type = FormFieldTypes.Text,
                Label = "Full name",
                Required = true,
            },
            new()
            {
                Id = "phone",
                Type = FormFieldTypes.Phone,
                Label = "Mobile number",
                Required = true,
                PhoneCountry = "SG",
            },
            new()
            {
                Id = "email",
                Type = FormFieldTypes.Email,
                Label = "Email",
                Required = false,
            },
        };
        fields.AddRange(extraFields);
        return new ActivityFormSchema { Version = 1, Fields = fields };
    }
}
