using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationAnswerValidatorTests
{
    [Fact]
    public void Validate_SkipsSectionHeaderFields()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "about-you",
                    Type = FormFieldTypes.SectionHeader,
                    Label = "About you",
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

        var error = RegistrationAnswerValidator.Validate(
            schema,
            new Dictionary<string, object?> { ["email"] = "guest@example.com" });

        Assert.Null(error);
    }

    [Fact]
    public void Validate_StillRequiresInputFieldsWhenSectionHeadersPresent()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "about-you",
                    Type = FormFieldTypes.SectionHeader,
                    Label = "About you",
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

        var error = RegistrationAnswerValidator.Validate(schema, new Dictionary<string, object?>());

        Assert.NotNull(error);
        Assert.Contains("Email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_AcceptsHiddenQueryValue()
    {
        var error = RegistrationAnswerValidator.Validate(
            HiddenContactSchema(),
            ContactAnswers(("ref", "wa")));

        Assert.Null(error);
    }

    [Fact]
    public void Validate_RequiredHiddenMissing_Succeeds()
    {
        var error = RegistrationAnswerValidator.Validate(
            HiddenContactSchema(required: true),
            ContactAnswers());

        Assert.Null(error);
    }

    [Fact]
    public void Validate_HiddenOverMaxLengthAfterStrip_Fails()
    {
        var error = RegistrationAnswerValidator.Validate(
            HiddenContactSchema(),
            ContactAnswers(("ref", new string('a', 201))));

        Assert.NotNull(error);
        Assert.Contains("200", error, StringComparison.Ordinal);
    }

    [Fact]
    public void NormalizeAnswers_DoesNotRestoreEncodedHtmlTags()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            HiddenContactSchema(),
            ContactAnswers(("ref", "&lt;b&gt;wa&lt;/b&gt;")));

        Assert.Equal("wa", normalized["ref"]);
    }

    [Fact]
    public void NormalizeAnswers_DoesNotHtmlEncodeAmpersandsInHiddenValue()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            HiddenContactSchema(),
            ContactAnswers(("ref", "wa&ig")));

        Assert.Equal("wa&ig", normalized["ref"]);
    }

    [Fact]
    public void NormalizeAnswers_StripsHtmlFromHiddenValue()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            HiddenContactSchema(),
            ContactAnswers(("ref", "<b>wa</b>")));

        Assert.Equal("wa", normalized["ref"]);
    }

    [Fact]
    public void NormalizeAnswers_UsesHiddenDefaultValueWhenMissing()
    {
        var schema = HiddenContactSchema();
        schema.Fields.Single(field => field.Id == "ref").DefaultValue = "ig";

        var normalized = RegistrationAnswerValidator.NormalizeAnswers(schema, ContactAnswers());

        Assert.Equal("ig", normalized["ref"]);
    }

    [Fact]
    public void NormalizeAnswers_HtmlOnlyHiddenValueFallsBackToDefault()
    {
        var schema = HiddenContactSchema();
        schema.Fields.Single(field => field.Id == "ref").DefaultValue = "ig";

        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            schema,
            ContactAnswers(("ref", "<b></b>")));

        Assert.Equal("ig", normalized["ref"]);
    }

    [Fact]
    public void NormalizeAnswers_QueryWinsOverHiddenDefaultValue()
    {
        var schema = HiddenContactSchema();
        schema.Fields.Single(field => field.Id == "ref").DefaultValue = "ig";

        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            schema,
            ContactAnswers(("ref", "wa")));

        Assert.Equal("wa", normalized["ref"]);
    }

    [Fact]
    public void Validate_AcceptsTextareaAtMaxLengthAfterStrip()
    {
        var error = RegistrationAnswerValidator.Validate(
            LongTextSchema(),
            ContactAnswers(("notes", new string('a', 2000))));

        Assert.Null(error);
    }

    [Fact]
    public void Validate_TextareaOverMaxLengthAfterStrip_Fails()
    {
        var error = RegistrationAnswerValidator.Validate(
            LongTextSchema(),
            ContactAnswers(("notes", new string('a', 2001))));

        Assert.NotNull(error);
        Assert.Contains("2000", error, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_TextareaHtmlOnlyWhenRequired_Fails()
    {
        var schema = LongTextSchema(requiredNotes: true);
        var error = RegistrationAnswerValidator.Validate(
            schema,
            ContactAnswers(("notes", "<b></b>")));

        Assert.NotNull(error);
        Assert.Contains("Notes", error, StringComparison.Ordinal);
    }

    [Fact]
    public void NormalizeAnswers_StripsHtmlFromTextarea()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            LongTextSchema(),
            ContactAnswers(("notes", "<b>Saturday mornings</b>")));

        Assert.Equal("Saturday mornings", normalized["notes"]);
    }

    [Fact]
    public void Validate_AcceptsValidDate()
    {
        var error = RegistrationAnswerValidator.Validate(
            LongTextSchema(),
            ContactAnswers(("preferred_date", "2026-09-12")));

        Assert.Null(error);
    }

    [Fact]
    public void Validate_RejectsImpossibleAndNonIsoDates()
    {
        var impossible = RegistrationAnswerValidator.Validate(
            LongTextSchema(),
            ContactAnswers(("preferred_date", "2026-02-30")));
        Assert.NotNull(impossible);
        Assert.Contains("YYYY-MM-DD", impossible, StringComparison.Ordinal);

        var garbage = RegistrationAnswerValidator.Validate(
            LongTextSchema(),
            ContactAnswers(("preferred_date", "not-a-date")));
        Assert.NotNull(garbage);
        Assert.Contains("YYYY-MM-DD", garbage, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_MissingOptionalDate_Succeeds()
    {
        var error = RegistrationAnswerValidator.Validate(LongTextSchema(), ContactAnswers());

        Assert.Null(error);
    }

    [Fact]
    public void NormalizeAnswers_StoresIsoDate()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            LongTextSchema(),
            ContactAnswers(("preferred_date", "  2026-09-12  ")));

        Assert.Equal("2026-09-12", normalized["preferred_date"]);
    }

    [Fact]
    public void Validate_Wave1NumberUrlTimeChoiceYesNoCountry()
    {
        Assert.Null(RegistrationAnswerValidator.Validate(
            Wave1Schema(),
            Wave1Answers(("party_size", "3"), ("website", "https://example.com"), ("arrival", "09:30"), ("level", "beginner"), ("bringing_guest", false), ("days", new[] { "sat" }), ("nationality", "PH"))));

        Assert.Contains("number", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("party_size", "abc")))!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("at most", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("party_size", "20")))!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("http", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("website", "ftp://x")))!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("HH:mm", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("arrival", "25:00")))!, StringComparison.Ordinal);
        Assert.Contains("allowed options", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("level", "pro")))!, StringComparison.Ordinal);
        Assert.Contains("at most", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("days", new[] { "sat", "sun", "mon" })))!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("country", RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers(("nationality", "ZZ")))!, StringComparison.OrdinalIgnoreCase);
        Assert.Null(RegistrationAnswerValidator.Validate(Wave1Schema(), Wave1Answers()));
    }

    [Fact]
    public void Validate_ScaleAndEmergency()
    {
        var schema = CorePlusSchema();

        Assert.Null(RegistrationAnswerValidator.Validate(
            schema,
            ContactAnswers(
                ("skill", "3"),
                ("emergency_contact", new Dictionary<string, object?>
                {
                    ["name"] = "Alex",
                    ["phone"] = "91234567",
                }))));

        Assert.Contains("1 to 5", RegistrationAnswerValidator.Validate(
            schema,
            ContactAnswers(("skill", "9")))!,
            StringComparison.Ordinal);

        Assert.Contains("required", RegistrationAnswerValidator.Validate(
            schema,
            ContactAnswers(("emergency_contact", new Dictionary<string, object?>
            {
                ["name"] = "Alex",
            })))!,
            StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeAnswers_StoresScaleAndEmergency()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            CorePlusSchema(),
            ContactAnswers(
                ("skill", " 4 "),
                ("emergency_contact", new Dictionary<string, object?>
                {
                    ["name"] = " Alex ",
                    ["phone"] = " 91234567 ",
                })));

        Assert.Equal("4", normalized["skill"]);
        var emergency = Assert.IsType<Dictionary<string, string?>>(normalized["emergency_contact"]);
        Assert.Equal("Alex", emergency["name"]);
        Assert.Equal("91234567", emergency["phone"]);
    }

    [Fact]
    public void Validate_MultiChoiceMinAboveInt32_ReturnsErrorInsteadOfThrowing()
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
                new FormFieldDefinition
                {
                    Id = "days",
                    Type = FormFieldTypes.MultiChoice,
                    Label = "Days",
                    Min = (decimal)int.MaxValue + 1,
                    Options =
                    [
                        new FormFieldOption { Value = "sat", Label = "Saturday" },
                        new FormFieldOption { Value = "sun", Label = "Sunday" },
                    ],
                },
            ],
        };

        var error = RegistrationAnswerValidator.Validate(
            schema,
            new Dictionary<string, object?>
            {
                ["email"] = "guest@example.com",
                ["days"] = new[] { "sat" },
            });

        Assert.NotNull(error);
        Assert.Contains("at least", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeAnswers_IgnoresUnknownAnswerKeys()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            HiddenContactSchema(),
            ContactAnswers(("ref", "wa"), ("utm_source", "instagram")));

        Assert.False(normalized.ContainsKey("utm_source"));
        Assert.Equal("wa", normalized["ref"]);
    }

    private static ActivityFormSchema Wave1Schema() =>
        new()
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
                new FormFieldDefinition
                {
                    Id = "party_size",
                    Type = FormFieldTypes.Number,
                    Label = "Party size",
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
                    Label = "Guest?",
                },
                new FormFieldDefinition
                {
                    Id = "days",
                    Type = FormFieldTypes.MultiChoice,
                    Label = "Days",
                    Max = 2,
                    Options =
                    [
                        new FormFieldOption { Value = "sat", Label = "Saturday" },
                        new FormFieldOption { Value = "sun", Label = "Sunday" },
                        new FormFieldOption { Value = "mon", Label = "Monday" },
                    ],
                },
                new FormFieldDefinition
                {
                    Id = "notice",
                    Type = FormFieldTypes.Info,
                    Label = "Note",
                    InfoText = "Hi",
                },
                new FormFieldDefinition
                {
                    Id = "nationality",
                    Type = FormFieldTypes.Country,
                    Label = "Nationality",
                },
            ],
        };

    private static Dictionary<string, object?> Wave1Answers(
        params (string Key, object? Value)[] extras) =>
        ContactAnswers(extras);

    private static ActivityFormSchema LongTextSchema(bool requiredNotes = false) =>
        new()
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
                new FormFieldDefinition
                {
                    Id = "notes",
                    Type = FormFieldTypes.Textarea,
                    Label = "Notes",
                    Required = requiredNotes,
                },
                new FormFieldDefinition
                {
                    Id = "preferred_date",
                    Type = FormFieldTypes.Date,
                    Label = "Preferred date",
                },
            ],
        };

    private static ActivityFormSchema HiddenContactSchema(bool required = false) =>
        new()
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
                new FormFieldDefinition
                {
                    Id = "ref",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign ref",
                    Required = required,
                },
            ],
        };

    private static Dictionary<string, object?> ContactAnswers(
        params (string Key, object? Value)[] extras)
    {
        var answers = new Dictionary<string, object?>
        {
            ["email"] = "guest@example.com",
        };

        foreach (var (key, value) in extras)
        {
            answers[key] = value;
        }

        return answers;
    }

    private static ActivityFormSchema CorePlusSchema() =>
        new()
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
                new FormFieldDefinition
                {
                    Id = "skill",
                    Type = FormFieldTypes.Scale,
                    Label = "Skill level",
                    Required = true,
                },
                new FormFieldDefinition
                {
                    Id = "emergency_contact",
                    Type = FormFieldTypes.Emergency,
                    Label = "Emergency contact",
                    Required = true,
                    PhoneCountry = "SG",
                },
            ],
        };
}
