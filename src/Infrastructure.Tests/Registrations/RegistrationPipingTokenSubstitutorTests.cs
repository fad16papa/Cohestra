using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationPipingTokenSubstitutorTests
{
    [Fact]
    public void SubstituteParticipantVisible_ReplacesFullName()
    {
        var schema = CreateSchema();
        var profile = new ExtractedClientProfile(
            NameFromForm: "Maya",
            DisplayName: "Maya",
            Phone: "+6591234567",
            NormalizedPhone: "+6591234567",
            Email: "maya@example.com",
            NormalizedEmail: "maya@example.com",
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: true,
            ReferralSource: null);

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "See you Saturday, {{full_name}}.",
            schema,
            profile,
            new Dictionary<string, object?>());

        Assert.Equal("See you Saturday, Maya.", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_HiddenFieldToken_IsEmpty()
    {
        var schema = CreateSchema();
        var profile = CreateProfile();
        var answers = new Dictionary<string, object?> { ["ref"] = "wa" };

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Ref: {{field:ref}}",
            schema,
            profile,
            answers);

        Assert.Equal("Ref: ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_MissingValue_IsEmptyString()
    {
        var schema = CreateSchema();
        var profile = new ExtractedClientProfile(
            NameFromForm: null,
            DisplayName: string.Empty,
            Phone: null,
            NormalizedPhone: null,
            Email: null,
            NormalizedEmail: null,
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: false,
            ReferralSource: null);

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Hello {{full_name}}",
            schema,
            profile,
            new Dictionary<string, object?>());

        Assert.Equal("Hello ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_FieldToken_UsesFormattedAnswer()
    {
        var schema = CreateSchema();
        var profile = CreateProfile();
        var answers = new Dictionary<string, object?> { ["notes"] = "Prefers morning slots" };

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Notes: {{field:notes}}",
            schema,
            profile,
            answers);

        Assert.Equal("Notes: Prefers morning slots", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_ReplacesEmailAndPhone()
    {
        var schema = CreateSchema();
        var profile = CreateProfile();

        var emailResult = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Reach me at {{email}}",
            schema,
            profile,
            new Dictionary<string, object?>());

        var phoneResult = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Call {{phone}}",
            schema,
            profile,
            new Dictionary<string, object?>());

        Assert.Equal("Reach me at maya@example.com", emailResult);
        Assert.Equal("Call +6591234567", phoneResult);
    }

    [Fact]
    public void SubstituteParticipantVisible_FullNameIgnoresDisplayNameFallback()
    {
        var schema = CreateSchema();
        var profile = new ExtractedClientProfile(
            NameFromForm: null,
            DisplayName: "maya@example.com",
            Phone: null,
            NormalizedPhone: null,
            Email: "maya@example.com",
            NormalizedEmail: "maya@example.com",
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: false,
            ReferralSource: null);

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Hello {{full_name}}",
            schema,
            profile,
            new Dictionary<string, object?>());

        Assert.Equal("Hello ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_InfoFieldToken_IsEmpty()
    {
        var schema = CreateSchema(
            new FormFieldDefinition
            {
                Id = "welcome",
                Type = FormFieldTypes.Info,
                Label = "Welcome",
                Required = false,
            });

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Info: {{field:welcome}}",
            schema,
            CreateProfile(),
            new Dictionary<string, object?>());

        Assert.Equal("Info: ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_UnknownToken_IsCleared()
    {
        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Hi {{foo}} there",
            CreateSchema(),
            CreateProfile(),
            new Dictionary<string, object?>());

        Assert.Equal("Hi  there", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_EmptyBraceToken_IsCleared()
    {
        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Hi {{}} there",
            CreateSchema(),
            CreateProfile(),
            new Dictionary<string, object?>());

        Assert.Equal("Hi  there", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_UnclosedToken_IsCleared()
    {
        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Hi {{full_name there",
            CreateSchema(),
            CreateProfile(),
            new Dictionary<string, object?>());

        Assert.Equal("Hi ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_SectionHeaderFieldToken_IsEmpty()
    {
        var schema = CreateSchema(
            new FormFieldDefinition
            {
                Id = "divider",
                Type = FormFieldTypes.SectionHeader,
                Label = "About you",
                Required = false,
            });

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Section: {{field:divider}}",
            schema,
            CreateProfile(),
            new Dictionary<string, object?>());

        Assert.Equal("Section: ", result);
    }

    [Fact]
    public void SubstituteParticipantVisible_FieldToken_IsCaseInsensitiveForSchemaId()
    {
        var schema = CreateSchema();
        var profile = CreateProfile();
        var answers = new Dictionary<string, object?> { ["notes"] = "Prefers morning slots" };

        var result = RegistrationPipingTokenSubstitutor.SubstituteParticipantVisible(
            "Notes: {{field:Notes}}",
            schema,
            profile,
            answers);

        Assert.Equal("Notes: Prefers morning slots", result);
    }

    private static ActivityFormSchema CreateSchema(params FormFieldDefinition[] extraFields) =>
        new()
        {
            Version = 1,
            Meta = new FormSchemaMeta
            {
                SuccessCopyMarkdown = "See you, {{full_name}}",
            },
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = FormFieldTypes.Text,
                    Label = "Full name",
                    Required = true,
                },
                new FormFieldDefinition
                {
                    Id = "ref",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign ref",
                    Required = false,
                },
                new FormFieldDefinition
                {
                    Id = "notes",
                    Type = FormFieldTypes.Textarea,
                    Label = "Notes",
                    Required = false,
                },
                ..extraFields,
            ],
        };

    private static ExtractedClientProfile CreateProfile() =>
        new(
            NameFromForm: "Maya",
            DisplayName: "Maya",
            Phone: "+6591234567",
            NormalizedPhone: "+6591234567",
            Email: "maya@example.com",
            NormalizedEmail: "maya@example.com",
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: true,
            ReferralSource: null);
}
