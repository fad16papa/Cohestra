using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class PublishGateValidatorTests
{
    [Fact]
    public void ValidateForPublish_RequiredHiddenOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "ref",
                        Type = FormFieldTypes.Hidden,
                        Label = "Campaign ref",
                        Required = true,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredPhonePlusHidden_Succeeds()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
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
                        Id = "ref",
                        Type = FormFieldTypes.Hidden,
                        Label = "Campaign ref",
                        Required = true,
                    },
                ],
            });

        Assert.Null(error);
    }

    [Fact]
    public void ValidateForPublish_RequiredScaleOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "skill",
                        Type = FormFieldTypes.Scale,
                        Label = "Skill level",
                        Required = true,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_PhonePlusScale_Succeeds()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
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
                        Id = "skill",
                        Type = FormFieldTypes.Scale,
                        Label = "Skill level",
                    },
                ],
            });

        Assert.Null(error);
    }

    [Fact]
    public void ValidateForPublish_RequiredEmergencyOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "emergency_contact",
                        Type = FormFieldTypes.Emergency,
                        Label = "Emergency contact",
                        Required = true,
                        PhoneCountry = "SG",
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredTextareaOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "notes",
                        Type = FormFieldTypes.Textarea,
                        Label = "Notes",
                        Required = true,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredDateOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "preferred_date",
                        Type = FormFieldTypes.Date,
                        Label = "Preferred date",
                        Required = true,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredPhonePlusTextareaAndDate_Succeeds()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
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
                        Id = "notes",
                        Type = FormFieldTypes.Textarea,
                        Label = "Notes",
                        Required = true,
                    },
                    new FormFieldDefinition
                    {
                        Id = "preferred_date",
                        Type = FormFieldTypes.Date,
                        Label = "Preferred date",
                    },
                ],
            });

        Assert.Null(error);
    }

    [Fact]
    public void ValidateForPublish_RequiredWave1Only_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "party_size",
                        Type = FormFieldTypes.Number,
                        Label = "Party size",
                        Required = true,
                    },
                    new FormFieldDefinition
                    {
                        Id = "bringing_guest",
                        Type = FormFieldTypes.YesNo,
                        Label = "Guest?",
                        Required = true,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredPhonePlusWave1_Succeeds()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
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
                        Id = "party_size",
                        Type = FormFieldTypes.Number,
                        Label = "Party size",
                    },
                    new FormFieldDefinition
                    {
                        Id = "notice",
                        Type = FormFieldTypes.Info,
                        Label = "Note",
                        InfoText = "Hi",
                    },
                ],
            });

        Assert.Null(error);
    }

    [Fact]
    public void ValidateForPublish_InfoOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "notice",
                        Type = FormFieldTypes.Info,
                        Label = "Welcome",
                        InfoText = "Thanks for joining.",
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_OptionalEmailOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "email",
                        Type = FormFieldTypes.Email,
                        Label = "Email",
                        Required = false,
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateForPublish_RequiredEmailOnly_Succeeds()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
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
            });

        Assert.Null(error);
    }

    [Fact]
    public void ValidateForPublish_OptionalPhoneOnly_Fails()
    {
        var error = PublishGateValidator.ValidateForPublish(
            new ActivityFormSchema
            {
                Version = 1,
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "phone",
                        Type = FormFieldTypes.Phone,
                        Label = "Mobile number",
                        Required = false,
                        PhoneCountry = "SG",
                    },
                ],
            });

        Assert.NotNull(error);
        Assert.Contains("required phone or email", error, StringComparison.Ordinal);
    }
}
