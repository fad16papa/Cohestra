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
    public void ValidateModel_RejectsSuccessCopyOverMaxLength()
    {
        var schema = ContactSchema();
        schema.Meta = new FormSchemaMeta
        {
            SuccessCopyMarkdown = new string('a', 2001),
        };

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("Success copy", error, StringComparison.Ordinal);
    }

    [Fact]
    public void MapToDomain_TrimsPipingMetaFields()
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
            new FormSchemaMetaDto(
                IntroMarkdown: null,
                SplitIntoSteps: false,
                SuccessCopyMarkdown: "  See you, {{full_name}}  ",
                ConfirmationEmailSubject: "  Hi {{full_name}}  ",
                ConfirmationEmailBodyMarkdown: "  Thanks {{full_name}}  "));

        var schema = FormSchemaValidator.MapToDomain(dto);

        Assert.Equal("See you, {{full_name}}", schema.Meta?.SuccessCopyMarkdown);
        Assert.Equal("Hi {{full_name}}", schema.Meta?.ConfirmationEmailSubject);
        Assert.Equal("Thanks {{full_name}}", schema.Meta?.ConfirmationEmailBodyMarkdown);
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
    public void ValidateModel_AcceptsTextareaAndDateBesideHidden()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "ref",
                Type = FormFieldTypes.Hidden,
                Label = "Campaign ref",
            },
            new FormFieldDefinition
            {
                Id = "notes",
                Type = FormFieldTypes.Textarea,
                Label = "Notes",
                Placeholder = "Anything we should know?",
            },
            new FormFieldDefinition
            {
                Id = "preferred_date",
                Type = FormFieldTypes.Date,
                Label = "Preferred date",
            });

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_AcceptsWave1ToolboxTypes()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "party_size",
                Type = FormFieldTypes.Number,
                Label = "Party size",
                Min = 1,
                Max = 8,
            },
            new FormFieldDefinition
            {
                Id = "website",
                Type = FormFieldTypes.Url,
                Label = "Website",
            },
            new FormFieldDefinition
            {
                Id = "arrival",
                Type = FormFieldTypes.Time,
                Label = "Arrival",
            },
            new FormFieldDefinition
            {
                Id = "level",
                Type = FormFieldTypes.Choice,
                Label = "Level",
                Options =
                [
                    new FormFieldOption { Value = "beginner", Label = "Beginner" },
                    new FormFieldOption { Value = "advanced", Label = "Advanced" },
                ],
            },
            new FormFieldDefinition
            {
                Id = "bringing_guest",
                Type = FormFieldTypes.YesNo,
                Label = "Bringing a guest?",
            },
            new FormFieldDefinition
            {
                Id = "days",
                Type = FormFieldTypes.MultiChoice,
                Label = "Days",
                Min = 1,
                Max = 2,
                Options =
                [
                    new FormFieldOption { Value = "sat", Label = "Saturday" },
                    new FormFieldOption { Value = "sun", Label = "Sunday" },
                ],
            },
            new FormFieldDefinition
            {
                Id = "notice",
                Type = FormFieldTypes.Info,
                Label = "Please note",
                InfoText = "Bring water.",
            },
            new FormFieldDefinition
            {
                Id = "nationality",
                Type = FormFieldTypes.Country,
                Label = "Nationality",
            });

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_RejectsMultiChoiceMinAboveOptionCount()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "days",
                Type = FormFieldTypes.MultiChoice,
                Label = "Days",
                Min = 3,
                Options =
                [
                    new FormFieldOption { Value = "sat", Label = "Saturday" },
                    new FormFieldOption { Value = "sun", Label = "Sunday" },
                ],
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("min cannot exceed the number of options", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsTextareaOptionsAndDefaultValue()
    {
        var withOptions = ContactSchema(
            new FormFieldDefinition
            {
                Id = "notes",
                Type = FormFieldTypes.Textarea,
                Label = "Notes",
                Options = [new FormFieldOption { Value = "a", Label = "A" }],
            });
        var optionsError = FormSchemaValidator.ValidateModel(withOptions);
        Assert.NotNull(optionsError);
        Assert.Contains("options", optionsError, StringComparison.Ordinal);

        var withDefault = ContactSchema(
            new FormFieldDefinition
            {
                Id = "notes",
                Type = FormFieldTypes.Textarea,
                Label = "Notes",
                DefaultValue = "hello",
            });
        var defaultError = FormSchemaValidator.ValidateModel(withDefault);
        Assert.NotNull(defaultError);
        Assert.Contains("defaultValue", defaultError, StringComparison.Ordinal);
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
        Assert.Contains("textarea", error, StringComparison.Ordinal);
        Assert.Contains("date", error, StringComparison.Ordinal);
        Assert.Contains("number", error, StringComparison.Ordinal);
        Assert.Contains("yes_no", error, StringComparison.Ordinal);
        Assert.Contains("country", error, StringComparison.Ordinal);
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
    public void ValidateDto_RejectsNonHiddenDefaultValueThatSanitizesEmpty()
    {
        var error = FormSchemaValidator.ValidateDto(
            new ActivityFormSchemaDto(
                1,
                [
                    new FormFieldDefinitionDto(
                        "full_name",
                        FormFieldTypes.Text,
                        "Full name",
                        true,
                        null,
                        null,
                        null,
                        null,
                        DefaultValue: "<b></b>"),
                ]));

        Assert.NotNull(error);
        Assert.Contains("defaultValue", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsDefaultValueOnTextField()
    {
        var schema = ContactSchema();
        schema.Fields[0].DefaultValue = "Maya";

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("defaultValue", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsDefaultValueOnSectionHeader()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "about",
                Type = FormFieldTypes.SectionHeader,
                Label = "About you",
                Required = false,
                DefaultValue = "should-not-save",
            });

        var error = FormSchemaValidator.ValidateModel(schema);

        Assert.NotNull(error);
        Assert.Contains("defaultValue", error, StringComparison.Ordinal);
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

    [Fact]
    public void ValidateModel_AcceptsScaleAndEmergencyFields()
    {
        var schema = ContactSchema(
            new FormFieldDefinition
            {
                Id = "skill",
                Type = FormFieldTypes.Scale,
                Label = "Skill level",
            },
            new FormFieldDefinition
            {
                Id = "emergency_contact",
                Type = FormFieldTypes.Emergency,
                Label = "Emergency contact",
                PhoneCountry = "SG",
            });

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
    }

    [Fact]
    public void ValidateModel_RejectsScaleOptions()
    {
        var error = FormSchemaValidator.ValidateModel(ContactSchema(
            new FormFieldDefinition
            {
                Id = "skill",
                Type = FormFieldTypes.Scale,
                Label = "Skill level",
                Options = [new FormFieldOption { Value = "1", Label = "One" }],
            }));

        Assert.NotNull(error);
        Assert.Contains("options", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_RejectsInvalidEmergencyPhoneCountry()
    {
        var error = FormSchemaValidator.ValidateModel(ContactSchema(
            new FormFieldDefinition
            {
                Id = "emergency_contact",
                Type = FormFieldTypes.Emergency,
                Label = "Emergency contact",
                PhoneCountry = "ZZ",
            }));

        Assert.NotNull(error);
        Assert.Contains("phoneCountry", error, StringComparison.Ordinal);
    }

    [Fact]
    public void MapToDomain_DefaultsEmergencyPhoneCountry()
    {
        var dto = new ActivityFormSchemaDto(
            1,
            [
                new FormFieldDefinitionDto(
                    "emergency_contact",
                    FormFieldTypes.Emergency,
                    "Emergency contact",
                    false,
                    null,
                    null,
                    null,
                    null),
            ]);

        var schema = FormSchemaValidator.MapToDomain(dto);

        Assert.Equal("SG", schema.Fields[0].PhoneCountry);
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
