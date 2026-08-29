using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class ClientProfileExtractorTests
{
    [Fact]
    public void Extract_HiddenFullName_DoesNotSetNameFromForm()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign name",
                    Required = true,
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

        var profile = ClientProfileExtractor.Extract(
            schema,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Maya",
                ["email"] = "maya@example.com",
            });

        Assert.Null(profile.NameFromForm);
        Assert.Equal("maya@example.com", profile.Email);
    }

    [Fact]
    public void Extract_HiddenPhoneAndEmailIds_DoNotMapContact()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "phone",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign phone",
                },
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign email",
                },
            ],
        };

        var profile = ClientProfileExtractor.Extract(
            schema,
            new Dictionary<string, object?>
            {
                ["phone"] = "09181234567",
                ["email"] = "maya@example.com",
            });

        Assert.Null(profile.Phone);
        Assert.Null(profile.Email);
        Assert.Null(profile.NameFromForm);
    }

    [Fact]
    public void Extract_TextareaFullName_SetsNameFromForm()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = FormFieldTypes.Textarea,
                    Label = "Full name",
                    Required = true,
                },
            ],
        };

        var profile = ClientProfileExtractor.Extract(
            schema,
            new Dictionary<string, object?> { ["full_name"] = "Maya Cruz" });

        Assert.Equal("Maya Cruz", profile.NameFromForm);
    }

    [Fact]
    public void Extract_DateFullName_DoesNotSetNameFromForm()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = FormFieldTypes.Date,
                    Label = "Full name",
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

        var profile = ClientProfileExtractor.Extract(
            schema,
            new Dictionary<string, object?>
            {
                ["full_name"] = "2026-09-12",
                ["email"] = "maya@example.com",
            });

        Assert.Null(profile.NameFromForm);
        Assert.Equal("maya@example.com", profile.Email);
    }
}
