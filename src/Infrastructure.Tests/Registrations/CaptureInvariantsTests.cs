using System.Reflection;
using Cohestra.Application.Registrations;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

/// <summary>
/// Regression locks for Epic 30 Capture invariants (Story 30.10 / FR-RC-14).
/// </summary>
public sealed class CaptureInvariantsTests
{
    [Fact]
    public void FormSchema_types_do_not_include_registration_theme()
    {
        Assert.DoesNotContain(
            typeof(ActivityFormSchema).GetProperties(BindingFlags.Public | BindingFlags.Instance),
            property => property.Name.Contains("RegistrationTheme", StringComparison.Ordinal));

        Assert.DoesNotContain(
            typeof(FormSchemaMeta).GetProperties(BindingFlags.Public | BindingFlags.Instance),
            property => property.Name.Contains("RegistrationTheme", StringComparison.Ordinal));
    }

    [Fact]
    public void Activity_stores_registration_theme_separate_from_form_schema()
    {
        var formSchemaProperty = typeof(Activity).GetProperty(nameof(Activity.FormSchema));
        var themeProperty = typeof(Activity).GetProperty(nameof(Activity.RegistrationTheme));

        Assert.NotNull(formSchemaProperty);
        Assert.NotNull(themeProperty);
        Assert.NotEqual(formSchemaProperty!.PropertyType, themeProperty!.PropertyType);
    }

    [Fact]
    public void IRegistrationService_exposes_submit_only()
    {
        var methods = typeof(IRegistrationService).GetMethods();

        Assert.Single(methods);
        Assert.Equal(nameof(IRegistrationService.SubmitPublicRegistrationAsync), methods[0].Name);
    }

    [Fact]
    public void PreCaptureV1Schema_passes_publish_gate_and_validation()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
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
                    Id = "phone",
                    Type = FormFieldTypes.Phone,
                    Label = "Mobile number",
                    Required = true,
                    PhoneCountry = "SG",
                },
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = false,
                },
                new FormFieldDefinition
                {
                    Id = "consent",
                    Type = FormFieldTypes.Consent,
                    Label = "Consent",
                    Required = true,
                    ConsentText = "I agree to be contacted.",
                },
            ],
        };

        Assert.Null(FormSchemaValidator.ValidateModel(schema));
        Assert.Null(PublishGateValidator.ValidateForPublish(schema));
    }

    [Fact]
    public void NormalizeAnswers_does_not_mutate_input_dictionary()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "phone",
                    Type = FormFieldTypes.Phone,
                    Label = "Mobile number",
                    Required = true,
                    PhoneCountry = "SG",
                },
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = FormFieldTypes.Text,
                    Label = "Full name",
                    Required = true,
                },
            ],
        };

        var originalAnswers = new Dictionary<string, object?>
        {
            ["phone"] = "91234567",
            ["full_name"] = "Maya Chen",
        };

        var normalized = RegistrationAnswerValidator.NormalizeAnswers(schema, originalAnswers);

        Assert.Equal("91234567", originalAnswers["phone"]);
        Assert.Equal("Maya Chen", originalAnswers["full_name"]);
        Assert.Equal("91234567", normalized["phone"]);
        Assert.Equal("Maya Chen", normalized["full_name"]);
    }
}
