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
}
