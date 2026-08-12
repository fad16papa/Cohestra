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
}
