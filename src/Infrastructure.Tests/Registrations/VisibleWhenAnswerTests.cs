using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class VisibleWhenAnswerTests
{
    [Fact]
    public void Validate_DoesNotRequireInvisibleGuestName()
    {
        var error = RegistrationAnswerValidator.Validate(
            GuestSchema(),
            new Dictionary<string, object?>
            {
                ["bringing_guest"] = "no",
                ["email"] = "maya@example.com",
            });

        Assert.Null(error);
    }

    [Fact]
    public void Validate_RequiresGuestNameWhenYes()
    {
        var error = RegistrationAnswerValidator.Validate(
            GuestSchema(),
            new Dictionary<string, object?>
            {
                ["bringing_guest"] = "yes",
                ["email"] = "maya@example.com",
            });

        Assert.NotNull(error);
        Assert.Contains("Guest name", error, StringComparison.Ordinal);
    }

    [Fact]
    public void NormalizeAnswers_DropsSpoofedInvisibleField()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            GuestSchema(),
            new Dictionary<string, object?>
            {
                ["bringing_guest"] = "no",
                ["guest_name"] = "Spoofed",
                ["email"] = "maya@example.com",
            });

        Assert.False(normalized.ContainsKey("guest_name"));
        Assert.Equal("maya@example.com", normalized["email"]);
    }

    [Fact]
    public void NormalizeAnswers_KeepsVisibleGuestName()
    {
        var normalized = RegistrationAnswerValidator.NormalizeAnswers(
            GuestSchema(),
            new Dictionary<string, object?>
            {
                ["bringing_guest"] = "yes",
                ["guest_name"] = "Alex",
                ["email"] = "maya@example.com",
            });

        Assert.Equal("Alex", normalized["guest_name"]);
    }

    private static ActivityFormSchema GuestSchema() =>
        new()
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "bringing_guest",
                    Type = FormFieldTypes.Select,
                    Label = "Bringing a guest?",
                    Required = true,
                    Options =
                    [
                        new FormFieldOption { Value = "yes", Label = "Yes" },
                        new FormFieldOption { Value = "no", Label = "No" },
                    ],
                },
                new FormFieldDefinition
                {
                    Id = "guest_name",
                    Type = FormFieldTypes.Text,
                    Label = "Guest name",
                    Required = true,
                    VisibleWhen = new FormFieldVisibleWhen
                    {
                        FieldId = "bringing_guest",
                        EqualsValue = "yes",
                    },
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
}
